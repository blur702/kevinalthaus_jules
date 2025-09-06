import { BlobServiceClient, ContainerClient, BlockBlobClient, PublicAccessType, BlobSASPermissions } from '@azure/storage-blob';
import { StorageProvider, UploadOptions } from '@/types/file.types';
import { AzureUploadOptions } from '@/types/azure.types';
import { toErrorWithMessage } from '@/types/express.types';
import { storageConfig } from '@/config/storage.config';
import { logger } from '@/utils/logger';
import { Readable } from 'stream';

export class AzureStorageProvider implements StorageProvider {
  name = 'azure';
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;

  constructor() {
    const config = storageConfig.providers.azure;
    
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      config.connectionString
    );
    
    this.containerName = config.containerName;
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    
    this.ensureContainerExists();
  }

  private async ensureContainerExists(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists({
        access: 'private' as PublicAccessType,
      });
      logger.info(`Azure container ensured: ${this.containerName}`);
    } catch (error) {
      logger.error('Failed to ensure Azure container:', error);
    }
  }

  private getBlobName(options: UploadOptions, originalName: string): string {
    const folder = options.folder || 'uploads';
    const filename = options.filename || `${Date.now()}-${originalName}`;
    return `${folder}/${filename}`;
  }

  async upload(file: Express.Multer.File, options: UploadOptions): Promise<string> {
    try {
      const blobName = this.getBlobName(options, file.originalname);
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      
      const fileBuffer = file.buffer || require('fs').readFileSync(file.path);
      
      const uploadOptions: AzureUploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.contentType || file.mimetype,
          blobCacheControl: 'max-age=31536000', // 1 year
        },
        metadata: options.metadata || {},
      };

      // Add encryption if enabled
      const config = storageConfig.providers.azure;
      if (config.encryption.enabled && config.encryption.keyVaultUrl) {
        // Note: For production, you would implement proper encryption key handling
        // This is a simplified example
        uploadOptions.encryptionScope = 'default';
      }

      const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
      await blockBlobClient.upload(buffer, buffer.length, uploadOptions);
      
      logger.info(`File uploaded to Azure: ${blobName}`);
      return blobName;
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Azure upload error:', errorWithMessage);
      throw new Error(`Failed to upload file to Azure: ${errorWithMessage.message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      const downloadResponse = await blockBlobClient.download(0);
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No data received from Azure');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
      
      const buffer = Buffer.concat(chunks);
      logger.debug(`File downloaded from Azure: ${key}`);
      return buffer;
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Azure download error:', errorWithMessage);
      throw new Error(`Failed to download file from Azure: ${errorWithMessage.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      await blockBlobClient.delete();
      
      logger.info(`File deleted from Azure: ${key}`);
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Azure delete error:', errorWithMessage);
      throw new Error(`Failed to delete file from Azure: ${errorWithMessage.message}`);
    }
  }

  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      
      // Check if blob exists
      await blockBlobClient.getProperties();

      // Generate SAS URL
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse('r'), // read permission
        expiresOn: expiryDate,
      });

      return sasUrl;
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Azure getUrl error:', errorWithMessage);
      throw new Error(`Failed to generate Azure URL: ${errorWithMessage.message}`);
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    try {
      const sourceClient = this.containerClient.getBlockBlobClient(sourceKey);
      const destClient = this.containerClient.getBlockBlobClient(destKey);
      
      const copyResult = await destClient.syncCopyFromURL(sourceClient.url);
      
      if (copyResult.copyStatus !== 'success') {
        throw new Error(`Copy operation failed with status: ${copyResult.copyStatus}`);
      }
      
      logger.info(`File copied in Azure: ${sourceKey} -> ${destKey}`);
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Azure copy error:', errorWithMessage);
      throw new Error(`Failed to copy file in Azure: ${errorWithMessage.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      return await blockBlobClient.exists();
    } catch (error) {
      logger.error('Azure exists check error:', error);
      return false;
    }
  }

  async getFileStats(key: string): Promise<{ size: number; modifiedAt: Date }> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      const properties = await blockBlobClient.getProperties();

      return {
        size: properties.contentLength || 0,
        modifiedAt: properties.lastModified || new Date(),
      };
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      throw new Error(`Failed to get Azure file stats: ${errorWithMessage.message}`);
    }
  }

  async uploadFromStream(
    key: string,
    stream: Readable,
    size: number,
    options: { contentType?: string; metadata?: Record<string, string> } = {}
  ): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.contentType,
          blobCacheControl: 'max-age=31536000',
        },
        metadata: options.metadata || {},
      };

      await blockBlobClient.uploadStream(stream as any, size, 4 * 1024 * 1024, uploadOptions);
      
      logger.info(`File uploaded from stream to Azure: ${key}`);
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Azure stream upload error:', errorWithMessage);
      throw new Error(`Failed to upload stream to Azure: ${errorWithMessage.message}`);
    }
  }

  async listBlobs(prefix?: string, maxResults: number = 1000): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    try {
      const blobs: Array<{ name: string; size: number; lastModified: Date }> = [];
      
      const listOptions = {
        prefix,
      };

      let count = 0;
      for await (const blob of this.containerClient.listBlobsFlat(listOptions)) {
        if (count >= maxResults) break;
        
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
        });
        
        count++;
      }

      return blobs;
    } catch (error) {
      logger.error('Azure list blobs error:', error);
      const errorWithMessage = toErrorWithMessage(error);
      throw new Error(`Failed to list Azure blobs: ${errorWithMessage.message}`);
    }
  }

  async setTier(key: string, tier: 'Hot' | 'Cool' | 'Archive'): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      await blockBlobClient.setAccessTier(tier);
      
      logger.info(`Blob tier set to ${tier} for Azure: ${key}`);
    } catch (error) {
      logger.error('Azure set tier error:', error);
      const errorWithMessage = toErrorWithMessage(error);
      throw new Error(`Failed to set blob tier: ${errorWithMessage.message}`);
    }
  }

  async createSnapshot(key: string): Promise<string> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(key);
      const snapshotResult = await blockBlobClient.createSnapshot();
      
      if (!snapshotResult.snapshot) {
        throw new Error('No snapshot identifier received');
      }

      logger.info(`Snapshot created for Azure blob: ${key}`);
      return snapshotResult.snapshot;
    } catch (error) {
      logger.error('Azure create snapshot error:', error);
      const errorWithMessage = toErrorWithMessage(error);
      throw new Error(`Failed to create snapshot: ${errorWithMessage.message}`);
    }
  }
}
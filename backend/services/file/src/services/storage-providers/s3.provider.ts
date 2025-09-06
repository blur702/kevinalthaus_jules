import AWS from 'aws-sdk';
import { StorageProvider, UploadOptions } from '@/types/file.types';
import { toErrorWithMessage } from '@/types/express.types';
import { storageConfig } from '@/config/storage.config';
import { logger } from '@/utils/logger';

export class S3StorageProvider implements StorageProvider {
  name = 's3';
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    const config = storageConfig.providers.s3;
    
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      endpoint: config.endpoint,
      s3ForcePathStyle: config.pathStyle,
    });
    
    this.bucket = config.bucket;
  }

  private getObjectKey(options: UploadOptions, originalName: string): string {
    const folder = options.folder || 'uploads';
    const filename = options.filename || `${Date.now()}-${originalName}`;
    return `${folder}/${filename}`;
  }

  async upload(file: Express.Multer.File, options: UploadOptions): Promise<string> {
    try {
      const key = this.getObjectKey(options, file.originalname);
      const config = storageConfig.providers.s3;
      
      const params: AWS.S3.PutObjectRequest = {
        Bucket: options.bucket || this.bucket,
        Key: key,
        Body: file.buffer || require('fs').readFileSync(file.path),
        ContentType: options.contentType || file.mimetype,
        Metadata: options.metadata || {},
      };

      // Add server-side encryption if enabled
      if (config.encryption.enabled) {
        params.ServerSideEncryption = 'aws:kms';
        if (config.encryption.kmsKeyId) {
          params.SSEKMSKeyId = config.encryption.kmsKeyId;
        }
      }

      // Set ACL based on public/private setting
      if (options.isPublic) {
        params.ACL = 'public-read';
      } else {
        params.ACL = 'private';
      }

      // Add cache control headers
      params.CacheControl = 'max-age=31536000'; // 1 year

      const result = await this.s3.upload(params).promise();
      
      logger.info(`File uploaded to S3: ${key}`);
      return key;
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${toErrorWithMessage(error).message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      const result = await this.s3.getObject(params).promise();
      
      if (!result.Body) {
        throw new Error('No data received from S3');
      }

      logger.debug(`File downloaded from S3: ${key}`);
      return result.Body as Buffer;
    } catch (error) {
      logger.error('S3 download error:', error);
      throw new Error(`Failed to download file from S3: ${toErrorWithMessage(error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${toErrorWithMessage(error).message}`);
    }
  }

  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      // Check if file exists first
      await this.s3.headObject(params).promise();

      // Generate presigned URL
      const url = await this.s3.getSignedUrlPromise('getObject', {
        ...params,
        Expires: expiresIn,
      });

      return url;
    } catch (error) {
      logger.error('S3 getUrl error:', error);
      throw new Error(`Failed to generate S3 URL: ${toErrorWithMessage(error).message}`);
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    try {
      const params: AWS.S3.CopyObjectRequest = {
        Bucket: this.bucket,
        Key: destKey,
        CopySource: `${this.bucket}/${sourceKey}`,
        MetadataDirective: 'COPY',
      };

      await this.s3.copyObject(params).promise();
      
      logger.info(`File copied in S3: ${sourceKey} -> ${destKey}`);
    } catch (error) {
      logger.error('S3 copy error:', error);
      throw new Error(`Failed to copy file in S3: ${toErrorWithMessage(error).message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      if ((error as any)?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getFileStats(key: string): Promise<{ size: number; modifiedAt: Date }> {
    try {
      const result = await this.s3.headObject({
        Bucket: this.bucket,
        Key: key,
      }).promise();

      return {
        size: result.ContentLength || 0,
        modifiedAt: result.LastModified || new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get S3 file stats: ${toErrorWithMessage(error).message}`);
    }
  }

  async initiateMultipartUpload(key: string, contentType: string): Promise<string> {
    try {
      const params: AWS.S3.CreateMultipartUploadRequest = {
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      };

      const result = await this.s3.createMultipartUpload(params).promise();
      
      if (!result.UploadId) {
        throw new Error('No upload ID received from S3');
      }

      logger.info(`Multipart upload initiated for S3: ${key}`);
      return result.UploadId;
    } catch (error) {
      logger.error('S3 multipart initiate error:', error);
      throw new Error(`Failed to initiate multipart upload: ${toErrorWithMessage(error).message}`);
    }
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer
  ): Promise<{ ETag: string; PartNumber: number }> {
    try {
      const params: AWS.S3.UploadPartRequest = {
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      };

      const result = await this.s3.uploadPart(params).promise();
      
      if (!result.ETag) {
        throw new Error('No ETag received from S3');
      }

      return {
        ETag: result.ETag,
        PartNumber: partNumber,
      };
    } catch (error) {
      logger.error('S3 upload part error:', error);
      throw new Error(`Failed to upload part: ${toErrorWithMessage(error).message}`);
    }
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>
  ): Promise<void> {
    try {
      const params: AWS.S3.CompleteMultipartUploadRequest = {
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      };

      await this.s3.completeMultipartUpload(params).promise();
      
      logger.info(`Multipart upload completed for S3: ${key}`);
    } catch (error) {
      logger.error('S3 complete multipart error:', error);
      throw new Error(`Failed to complete multipart upload: ${toErrorWithMessage(error).message}`);
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      const params: AWS.S3.AbortMultipartUploadRequest = {
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      };

      await this.s3.abortMultipartUpload(params).promise();
      
      logger.info(`Multipart upload aborted for S3: ${key}`);
    } catch (error) {
      logger.error('S3 abort multipart error:', error);
      // Don't throw error for abort operation
    }
  }

  async listObjects(prefix?: string, maxKeys: number = 1000): Promise<AWS.S3.Object[]> {
    try {
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error('S3 list objects error:', error);
      throw new Error(`Failed to list S3 objects: ${toErrorWithMessage(error).message}`);
    }
  }
}
import { StorageProvider, UploadOptions } from '@/types/file.types';
import { toErrorWithMessage } from '@/types/express.types';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { storageConfig } from '@/config/storage.config';
import { logger } from '@/utils/logger';
import { generateHash } from '@/utils/hash';

export class LocalStorageProvider implements StorageProvider {
  name = 'local';
  private basePath: string;

  constructor() {
    this.basePath = storageConfig.providers.local.basePath;
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
      logger.info(`Created storage directory: ${this.basePath}`);
    }
  }

  private getFilePath(key: string): string {
    // Prevent directory traversal attacks
    const sanitizedKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.basePath, sanitizedKey);
  }

  private async createDirectoryForFile(filePath: string): Promise<void> {
    const directory = path.dirname(filePath);
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, options: UploadOptions): Promise<string> {
    try {
      const filename = options.filename || `${Date.now()}-${file.originalname}`;
      const folder = options.folder || 'uploads';
      const key = `${folder}/${filename}`;
      const filePath = this.getFilePath(key);

      await this.createDirectoryForFile(filePath);

      // Copy file from temp location to storage
      if (file.path) {
        const readStream = createReadStream(file.path);
        const writeStream = createWriteStream(filePath);
        await pipeline(readStream, writeStream);
        
        // Clean up temp file
        await fs.unlink(file.path);
      } else if (file.buffer) {
        await fs.writeFile(filePath, file.buffer);
      }

      // Set file permissions
      await fs.chmod(filePath, 0o644);

      logger.info(`File uploaded to local storage: ${key}`);
      return key;
    } catch (error) {
      logger.error('Local storage upload error:', error);
      throw new Error(`Failed to upload file to local storage: ${toErrorWithMessage(error).message}`);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const filePath = this.getFilePath(key);
      const buffer = await fs.readFile(filePath);
      logger.debug(`File downloaded from local storage: ${key}`);
      return buffer;
    } catch (error) {
      logger.error('Local storage download error:', error);
      throw new Error(`Failed to download file from local storage: ${toErrorWithMessage(error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      
      // Clean up empty directories
      await this.cleanupEmptyDirectories(path.dirname(filePath));
      
      logger.info(`File deleted from local storage: ${key}`);
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      if ((error as any)?.code !== 'ENOENT') {
        logger.error('Local storage delete error:', errorWithMessage);
        throw new Error(`Failed to delete file from local storage: ${errorWithMessage.message}`);
      }
    }
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    // For local storage, return a signed URL that includes the file path and expiration
    const filePath = this.getFilePath(key);
    
    try {
      await fs.access(filePath);
      
      if (expiresIn) {
        const expiry = Date.now() + (expiresIn * 1000);
        const signature = await generateHash(`${key}:${expiry}`, process.env.FILE_URL_SECRET || 'default-secret');
        return `/api/files/local/${encodeURIComponent(key)}?expires=${expiry}&signature=${signature}`;
      }
      
      return `/api/files/local/${encodeURIComponent(key)}`;
    } catch (error) {
      throw new Error(`File not found: ${key}`);
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    try {
      const sourcePath = this.getFilePath(sourceKey);
      const destPath = this.getFilePath(destKey);
      
      await this.createDirectoryForFile(destPath);
      await fs.copyFile(sourcePath, destPath);
      
      logger.info(`File copied in local storage: ${sourceKey} -> ${destKey}`);
    } catch (error) {
      logger.error('Local storage copy error:', error);
      throw new Error(`Failed to copy file in local storage: ${toErrorWithMessage(error).message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(key: string): Promise<{ size: number; modifiedAt: Date }> {
    try {
      const filePath = this.getFilePath(key);
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${toErrorWithMessage(error).message}`);
    }
  }

  private async cleanupEmptyDirectories(dirPath: string): Promise<void> {
    try {
      // Don't clean up the base storage directory
      if (dirPath === this.basePath) return;
      
      const entries = await fs.readdir(dirPath);
      if (entries.length === 0) {
        await fs.rmdir(dirPath);
        // Recursively clean up parent directories
        await this.cleanupEmptyDirectories(path.dirname(dirPath));
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Cleanup old temporary files and empty directories
      const tempDir = path.join(this.basePath, 'temp');
      try {
        const tempFiles = await fs.readdir(tempDir);
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        
        for (const file of tempFiles) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            logger.debug(`Cleaned up old temp file: ${file}`);
          }
        }
      } catch (error) {
        // Temp directory might not exist, ignore
      }
      
      logger.info('Local storage cleanup completed');
    } catch (error) {
      logger.error('Local storage cleanup error:', error);
    }
  }
}
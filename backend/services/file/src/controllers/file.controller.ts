import { Response } from 'express';
import { AuthenticatedRequest, toErrorWithMessage } from '@/types/express.types';
import { FileUpload, UploadOptions, ProcessingOptions, FileSearchQuery } from '@/types/file.types';
import { LocalStorageProvider } from '@/services/storage-providers/local.provider';
import { S3StorageProvider } from '@/services/storage-providers/s3.provider';
import { AzureStorageProvider } from '@/services/storage-providers/azure.provider';
import { VirusScannerService } from '@/services/virus-scanner.service';
import { ImageProcessorService } from '@/services/image-processor.service';
import { storageConfig } from '@/config/storage.config';
import { logger, logSecurity, logPerformance } from '@/utils/logger';
import { generateSecureFilename, generateFileHash } from '@/utils/hash';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import path from 'path';

// File model schema
const fileSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  url: { type: String },
  cdnUrl: { type: String },
  thumbnailUrl: { type: String },
  userId: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  versions: [{ 
    id: String,
    version: Number,
    filename: String,
    size: Number,
    createdAt: Date,
    checksum: String
  }],
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  scanStatus: {
    status: { type: String, enum: ['pending', 'scanning', 'clean', 'infected', 'error'], default: 'pending' },
    scannedAt: Date,
    engine: String,
    version: String
  },
  scanResult: {
    isClean: Boolean,
    threats: [String],
    engine: String,
    version: String,
    scannedAt: Date
  }
});

const FileModel = mongoose.model('File', fileSchema);

export class FileController {
  private storageProviders: Map<string, any>;
  private virusScanner: VirusScannerService;
  private imageProcessor: ImageProcessorService;

  constructor() {
    this.storageProviders = new Map();
    this.initializeStorageProviders();
    this.virusScanner = new VirusScannerService();
    this.imageProcessor = new ImageProcessorService();
  }

  private initializeStorageProviders() {
    if (storageConfig.providers.local.enabled) {
      this.storageProviders.set('local', new LocalStorageProvider());
    }
    if (storageConfig.providers.s3.enabled) {
      this.storageProviders.set('s3', new S3StorageProvider());
    }
    if (storageConfig.providers.azure.enabled) {
      this.storageProviders.set('azure', new AzureStorageProvider());
    }
  }

  private getStorageProvider(providerName?: string) {
    const provider = providerName || storageConfig.defaultProvider;
    const storageProvider = this.storageProviders.get(provider);
    
    if (!storageProvider) {
      throw new Error(`Storage provider '${provider}' is not available`);
    }
    
    return storageProvider;
  }

  uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate file size
      if (file.size > storageConfig.security.validation.maxFileSize) {
        res.status(413).json({ 
          error: 'File too large',
          maxSize: storageConfig.security.validation.maxFileSize
        });
        return;
      }

      // Validate file type
      if (!this.isAllowedFileType(file.mimetype)) {
        res.status(400).json({ error: 'File type not allowed', mimetype: file.mimetype });
        return;
      }

      // Generate unique filename
      const filename = generateSecureFilename(file.originalname);
      const fileId = new mongoose.Types.ObjectId().toString();

      // Scan file for viruses
      const scanResult = await this.virusScanner.scanBuffer(file.buffer, file.originalname);
      
      if (!scanResult.isClean) {
        logSecurity('virus_detected', userId, { 
          filename: file.originalname,
          threats: scanResult.threats 
        });
        
        res.status(400).json({ 
          error: 'File contains malware',
          scanResult: scanResult
        });
        return;
      }

      // Process image if it's an image file
      let processedFile = file;
      let thumbnails: Array<{ size: string; buffer: Buffer }> = [];
      let metadata: any = {};

      if (this.imageProcessor.isImageFormat(file.mimetype)) {
        const processingOptions: ProcessingOptions = {
          resize: req.body.resize ? JSON.parse(req.body.resize) : undefined,
          compress: req.body.compress ? JSON.parse(req.body.compress) : undefined,
          format: req.body.format as any,
          watermark: req.body.watermark ? JSON.parse(req.body.watermark) : undefined,
        };

        const processed = await this.imageProcessor.processImage(
          file.buffer,
          processingOptions
        );

        processedFile = {
          ...file,
          buffer: processed.processedBuffer,
          size: processed.processedBuffer.length,
        };

        thumbnails = processed.thumbnails;
        metadata = processed.metadata;
      }

      // Upload to storage
      const storageProvider = this.getStorageProvider(req.body.provider);
      const uploadOptions: UploadOptions = {
        filename,
        folder: req.body.folder || 'uploads',
        contentType: processedFile.mimetype,
        isPublic: req.body.isPublic === 'true',
        metadata: {
          originalName: file.originalname,
          userId: userId,
          uploadedAt: new Date().toISOString(),
        },
      };

      const storagePath = await storageProvider.upload(processedFile, uploadOptions);
      
      // Upload thumbnails
      const thumbnailUrls: Record<string, string> = {};
      for (const thumbnail of thumbnails) {
        const thumbOptions: UploadOptions = {
          ...uploadOptions,
          filename: `${path.parse(filename).name}-${thumbnail.size}.jpg`,
          folder: `${uploadOptions.folder}/thumbnails`,
        };
        
        const thumbFile = {
          ...processedFile,
          buffer: thumbnail.buffer,
          size: thumbnail.buffer.length,
          mimetype: 'image/jpeg',
        };
        
        const thumbPath = await storageProvider.upload(thumbFile, thumbOptions);
        thumbnailUrls[thumbnail.size] = await storageProvider.getUrl(thumbPath);
      }

      // Generate file hash for versioning
      const fileHash = await generateFileHash(processedFile.buffer);

      // Get file URL
      const fileUrl = await storageProvider.getUrl(storagePath);

      // Save to database
      const fileRecord: Partial<FileUpload> = {
        id: fileId,
        originalName: file.originalname,
        filename,
        mimetype: processedFile.mimetype,
        size: processedFile.size,
        path: storagePath,
        url: fileUrl,
        thumbnailUrl: thumbnails.length > 0 ? thumbnailUrls['thumb'] : undefined,
        userId,
        metadata,
        versions: [{
          id: new mongoose.Types.ObjectId().toString(),
          version: 1,
          filename,
          size: processedFile.size,
          createdAt: new Date(),
          checksum: fileHash,
        }],
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        isPublic: uploadOptions.isPublic || false,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        scanStatus: {
          status: 'clean',
          scannedAt: new Date(),
          engine: scanResult.engine,
          version: scanResult.version,
        },
        scanResult,
      };

      const savedFile = await FileModel.create(fileRecord);

      logPerformance('file_upload', Date.now() - startTime, {
        fileId,
        size: processedFile.size,
        mimetype: processedFile.mimetype,
        provider: storageProvider.name,
      });

      logSecurity('file_upload', userId, {
        fileId,
        originalName: file.originalname,
        size: processedFile.size,
      });

      res.status(201).json({
        success: true,
        file: {
          id: savedFile.id,
          originalName: savedFile.originalName,
          filename: savedFile.filename,
          mimetype: savedFile.mimetype,
          size: savedFile.size,
          url: savedFile.url,
          thumbnailUrl: savedFile.thumbnailUrl,
          thumbnails: thumbnailUrls,
          isPublic: savedFile.isPublic,
          uploadedAt: savedFile.uploadedAt,
        },
      });

    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('File upload error:', errorWithMessage);
      res.status(500).json({ 
        error: 'File upload failed',
        message: errorWithMessage.message 
      });
    }
  };

  getFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id;

      const file = await FileModel.findOne({ id: fileId });
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Check permissions
      if (!file.isPublic && file.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check expiration
      if (file.expiresAt && file.expiresAt < new Date()) {
        res.status(410).json({ error: 'File expired' });
        return;
      }

      const storageProvider = this.getStorageProvider();
      const fileBuffer = await storageProvider.download(file.path);

      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Length', file.size.toString());
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      
      res.send(fileBuffer);

    } catch (error) {
      logger.error('File retrieval error:', error);
      res.status(500).json({ error: 'File retrieval failed' });
    }
  };

  deleteFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id;

      const file = await FileModel.findOne({ id: fileId });
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Check permissions
      if (file.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Delete from storage
      const storageProvider = this.getStorageProvider();
      await storageProvider.delete(file.path);

      // Delete thumbnails
      if (file.thumbnailUrl) {
        try {
          await storageProvider.delete(file.path.replace('/uploads/', '/uploads/thumbnails/'));
        } catch (error) {
          logger.warn('Failed to delete thumbnails:', error);
        }
      }

      // Delete from database
      await FileModel.deleteOne({ id: fileId });

      logSecurity('file_delete', userId, { fileId, originalName: file.originalName });

      res.json({ success: true, message: 'File deleted successfully' });

    } catch (error) {
      logger.error('File deletion error:', error);
      res.status(500).json({ error: 'File deletion failed' });
    }
  };

  searchFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const query: FileSearchQuery = req.query;

      const filter: any = {};

      // User-specific files unless admin
      if (!req.user?.isAdmin) {
        filter.$or = [
          { userId: userId },
          { isPublic: true }
        ];
      }

      if (query.mimetype) {
        filter.mimetype = new RegExp(query.mimetype, 'i');
      }

      if (query.minSize || query.maxSize) {
        filter.size = {};
        if (query.minSize) filter.size.$gte = query.minSize;
        if (query.maxSize) filter.size.$lte = query.maxSize;
      }

      if (query.uploadedAfter || query.uploadedBefore) {
        filter.uploadedAt = {};
        if (query.uploadedAfter) filter.uploadedAt.$gte = new Date(query.uploadedAfter);
        if (query.uploadedBefore) filter.uploadedAt.$lte = new Date(query.uploadedBefore);
      }

      if (query.tags && query.tags.length > 0) {
        filter.tags = { $in: query.tags };
      }

      if (query.query) {
        filter.$text = { $search: query.query };
      }

      const sortOptions: any = {};
      if (query.sortBy) {
        sortOptions[query.sortBy] = query.sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.uploadedAt = -1;
      }

      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 20));
      const skip = (page - 1) * limit;

      const [files, total] = await Promise.all([
        FileModel.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .select('-scanResult -versions'),
        FileModel.countDocuments(filter)
      ]);

      res.json({
        success: true,
        files: files.map(file => ({
          id: file.id,
          originalName: file.originalName,
          mimetype: file.mimetype,
          size: file.size,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          isPublic: file.isPublic,
          uploadedAt: file.uploadedAt,
          tags: file.tags,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
      logger.error('File search error:', error);
      res.status(500).json({ error: 'File search failed' });
    }
  };

  private isAllowedFileType(mimetype: string): boolean {
    const allowedTypes = storageConfig.security.validation.allowedMimeTypes;
    
    if (allowedTypes.length === 0) {
      // If no specific types are configured, check blocked extensions
      return true;
    }

    return allowedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return mimetype.startsWith(baseType + '/');
      }
      return mimetype === type;
    });
  }

  getFileStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.isAdmin;

      const matchStage = isAdmin ? {} : { userId };

      const stats = await FileModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$size' },
            avgSize: { $avg: '$size' },
          }
        }
      ]);

      const filesByType = await FileModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$mimetype',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' }
          }
        }
      ]);

      const uploadTrends = await FileModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$uploadedAt' },
              month: { $month: '$uploadedAt' },
              day: { $dayOfMonth: '$uploadedAt' }
            },
            count: { $sum: 1 },
            size: { $sum: '$size' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 }
      ]);

      res.json({
        success: true,
        stats: {
          totalFiles: stats[0]?.totalFiles || 0,
          totalSize: stats[0]?.totalSize || 0,
          avgSize: stats[0]?.avgSize || 0,
          filesByType: filesByType.map(item => ({
            type: item._id,
            count: item.count,
            size: item.totalSize
          })),
          uploadTrends: uploadTrends.map(item => ({
            date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
            count: item.count,
            size: item.size
          }))
        }
      });

    } catch (error) {
      logger.error('File stats error:', error);
      res.status(500).json({ error: 'Failed to get file stats' });
    }
  };
}
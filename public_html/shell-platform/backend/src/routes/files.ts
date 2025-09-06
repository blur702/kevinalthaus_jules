import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { body, param, validationResult } from 'express-validator';
import { ApiResponse, FileInfo, AuthenticatedRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/json',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// Mock files database - In production, this would be a real database
let mockFiles: FileInfo[] = [
  {
    id: '1',
    name: 'document.pdf',
    path: '/uploads/document-1234567890.pdf',
    size: 524288,
    mimeType: 'application/pdf',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    owner: 'admin',
  },
  {
    id: '2',
    name: 'image.jpg',
    path: '/uploads/image-1234567891.jpg',
    size: 1048576,
    mimeType: 'image/jpeg',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    owner: 'user',
  },
];

/**
 * GET /files
 * Get all files for the authenticated user
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response<ApiResponse<FileInfo[]>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const { type, limit = '50', offset = '0' } = req.query;
    let files = mockFiles;

    // Filter by user (non-admin users can only see their own files)
    if (req.user.role !== 'admin') {
      files = files.filter(file => file.owner === req.user!.username);
    }

    // Filter by file type if specified
    if (type && typeof type === 'string') {
      files = files.filter(file => file.mimeType.startsWith(type));
    }

    // Apply pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedFiles = files.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      data: paginatedFiles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve files',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /files/:id
 * Get specific file by ID
 */
router.get('/:id', [
  param('id').notEmpty().withMessage('File ID is required'),
  authenticate,
], async (req: AuthenticatedRequest, res: Response<ApiResponse<FileInfo>>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const file = mockFiles.find(f => f.id === id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user has access to this file
    if (req.user.role !== 'admin' && file.owner !== req.user.username) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'File retrieved successfully',
      data: file,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /files/upload
 * Upload a new file
 */
router.post('/upload', [
  authenticate,
  upload.single('file'),
], async (req: AuthenticatedRequest, res: Response<ApiResponse<FileInfo>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        timestamp: new Date().toISOString(),
      });
    }

    // Create file record
    const newFile: FileInfo = {
      id: (mockFiles.length + 1).toString(),
      name: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: req.user.username,
    };

    mockFiles.push(newFile);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: newFile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /files/upload/multiple
 * Upload multiple files
 */
router.post('/upload/multiple', [
  authenticate,
  upload.array('files', 10), // Maximum 10 files
], async (req: AuthenticatedRequest, res: Response<ApiResponse<FileInfo[]>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        timestamp: new Date().toISOString(),
      });
    }

    const uploadedFiles: FileInfo[] = [];

    for (const file of files) {
      const newFile: FileInfo = {
        id: (mockFiles.length + uploadedFiles.length + 1).toString(),
        name: file.originalname,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype,
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: req.user.username,
      };

      uploadedFiles.push(newFile);
    }

    mockFiles.push(...uploadedFiles);

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: uploadedFiles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload files',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /files/:id/download
 * Download a file
 */
router.get('/:id/download', [
  param('id').notEmpty().withMessage('File ID is required'),
  authenticate,
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const file = mockFiles.find(f => f.id === id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user has access to this file
    if (req.user.role !== 'admin' && file.owner !== req.user.username) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    const filePath = path.join(process.cwd(), file.path);
    
    // Check if file exists on disk
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk',
        timestamp: new Date().toISOString(),
      });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size.toString());

    // Stream the file
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /files/:id
 * Delete a file
 */
router.delete('/:id', [
  param('id').notEmpty().withMessage('File ID is required'),
  authenticate,
], async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const fileIndex = mockFiles.findIndex(f => f.id === id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        timestamp: new Date().toISOString(),
      });
    }

    const file = mockFiles[fileIndex];

    // Check if user has access to this file
    if (req.user.role !== 'admin' && file.owner !== req.user.username) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    // Remove file from disk
    const filePath = path.join(process.cwd(), file.path);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might already be deleted, log but don't fail
      console.warn(`Failed to delete file from disk: ${filePath}`);
    }

    // Remove from database
    mockFiles.splice(fileIndex, 1);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: { deletedFile: file.name },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /files/stats
 * Get file statistics for the user
 */
router.get('/stats/summary', authenticate, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    let userFiles = mockFiles;
    if (req.user.role !== 'admin') {
      userFiles = mockFiles.filter(file => file.owner === req.user!.username);
    }

    const stats = {
      totalFiles: userFiles.length,
      totalSize: userFiles.reduce((sum, file) => sum + file.size, 0),
      fileTypes: userFiles.reduce((types: Record<string, number>, file) => {
        const type = file.mimeType.split('/')[0];
        types[type] = (types[type] || 0) + 1;
        return types;
      }, {}),
      recentFiles: userFiles
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };

    res.status(200).json({
      success: true,
      message: 'File statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
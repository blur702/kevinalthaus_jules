import fs from 'fs/promises';
import path from 'path';
import { FileInfo } from '../types';

export class FileService {
  private static instance: FileService;
  
  // Mock files database
  private files: FileInfo[] = [
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
    {
      id: '3',
      name: 'config.json',
      path: '/uploads/config-1234567892.json',
      size: 2048,
      mimeType: 'application/json',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      owner: 'admin',
    },
  ];

  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Get all files for a user
   */
  public getFilesByUser(username: string, isAdmin: boolean = false): FileInfo[] {
    if (isAdmin) {
      return this.files;
    }
    return this.files.filter(file => file.owner === username);
  }

  /**
   * Get files with pagination and filtering
   */
  public getFiles(options: {
    username: string;
    isAdmin?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }): { files: FileInfo[]; total: number } {
    const { username, isAdmin = false, type, limit = 50, offset = 0 } = options;
    
    let filteredFiles = this.getFilesByUser(username, isAdmin);

    // Filter by type if specified
    if (type) {
      filteredFiles = filteredFiles.filter(file => file.mimeType.startsWith(type));
    }

    // Apply pagination
    const total = filteredFiles.length;
    const files = filteredFiles.slice(offset, offset + limit);

    return { files, total };
  }

  /**
   * Get file by ID
   */
  public getFileById(id: string): FileInfo | null {
    return this.files.find(file => file.id === id) || null;
  }

  /**
   * Check if user has access to file
   */
  public hasFileAccess(fileId: string, username: string, isAdmin: boolean = false): boolean {
    const file = this.getFileById(fileId);
    if (!file) {
      return false;
    }
    return isAdmin || file.owner === username;
  }

  /**
   * Add new file record
   */
  public addFile(fileData: Omit<FileInfo, 'id' | 'createdAt' | 'updatedAt'>): FileInfo {
    const newFile: FileInfo = {
      ...fileData,
      id: (this.files.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.files.push(newFile);
    return newFile;
  }

  /**
   * Add multiple files
   */
  public addMultipleFiles(filesData: Array<Omit<FileInfo, 'id' | 'createdAt' | 'updatedAt'>>): FileInfo[] {
    const newFiles = filesData.map((fileData, index) => ({
      ...fileData,
      id: (this.files.length + index + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    this.files.push(...newFiles);
    return newFiles;
  }

  /**
   * Update file metadata
   */
  public updateFile(id: string, updates: Partial<FileInfo>): FileInfo {
    const fileIndex = this.files.findIndex(file => file.id === id);
    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    this.files[fileIndex] = {
      ...this.files[fileIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return this.files[fileIndex];
  }

  /**
   * Delete file record and physical file
   */
  public async deleteFile(id: string): Promise<boolean> {
    const fileIndex = this.files.findIndex(file => file.id === id);
    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    const file = this.files[fileIndex];
    
    // Delete physical file
    try {
      const filePath = path.join(process.cwd(), file.path);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete physical file: ${file.path}`, error);
      // Continue with database deletion even if physical file deletion fails
    }

    // Remove from database
    this.files.splice(fileIndex, 1);
    return true;
  }

  /**
   * Get file statistics for a user
   */
  public getFileStats(username: string, isAdmin: boolean = false): {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    recentFiles: FileInfo[];
  } {
    const userFiles = this.getFilesByUser(username, isAdmin);

    const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
    
    const fileTypes = userFiles.reduce((types: Record<string, number>, file) => {
      const type = file.mimeType.split('/')[0];
      types[type] = (types[type] || 0) + 1;
      return types;
    }, {});

    const recentFiles = userFiles
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      totalFiles: userFiles.length,
      totalSize,
      fileTypes,
      recentFiles,
    };
  }

  /**
   * Search files by name
   */
  public searchFiles(username: string, query: string, isAdmin: boolean = false): FileInfo[] {
    const userFiles = this.getFilesByUser(username, isAdmin);
    const lowercaseQuery = query.toLowerCase();
    
    return userFiles.filter(file =>
      file.name.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get files by type
   */
  public getFilesByType(username: string, mimeType: string, isAdmin: boolean = false): FileInfo[] {
    const userFiles = this.getFilesByUser(username, isAdmin);
    return userFiles.filter(file => file.mimeType.startsWith(mimeType));
  }

  /**
   * Get file size summary
   */
  public getFileSizeSummary(username: string, isAdmin: boolean = false): {
    small: number;    // < 1MB
    medium: number;   // 1MB - 10MB
    large: number;    // > 10MB
  } {
    const userFiles = this.getFilesByUser(username, isAdmin);
    
    const summary = { small: 0, medium: 0, large: 0 };
    
    userFiles.forEach(file => {
      if (file.size < 1024 * 1024) { // < 1MB
        summary.small++;
      } else if (file.size < 10 * 1024 * 1024) { // 1MB - 10MB
        summary.medium++;
      } else { // > 10MB
        summary.large++;
      }
    });

    return summary;
  }

  /**
   * Get upload statistics
   */
  public getUploadStats(username: string, isAdmin: boolean = false): {
    today: number;
    thisWeek: number;
    thisMonth: number;
  } {
    const userFiles = this.getFilesByUser(username, isAdmin);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      today: userFiles.filter(file => file.createdAt >= today).length,
      thisWeek: userFiles.filter(file => file.createdAt >= weekAgo).length,
      thisMonth: userFiles.filter(file => file.createdAt >= monthAgo).length,
    };
  }

  /**
   * Clean up orphaned files (files without database records)
   */
  public async cleanupOrphanedFiles(): Promise<number> {
    try {
      const uploadDirFiles = await fs.readdir(this.uploadDir);
      const dbFilePaths = this.files.map(file => path.basename(file.path));
      
      let deletedCount = 0;
      
      for (const fileName of uploadDirFiles) {
        if (!dbFilePaths.includes(fileName)) {
          try {
            await fs.unlink(path.join(this.uploadDir, fileName));
            deletedCount++;
          } catch (error) {
            console.warn(`Failed to delete orphaned file: ${fileName}`, error);
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return 0;
    }
  }

  /**
   * Get storage usage
   */
  public getStorageUsage(username: string, isAdmin: boolean = false): {
    used: number;
    limit: number;
    percentage: number;
  } {
    const userFiles = this.getFilesByUser(username, isAdmin);
    const used = userFiles.reduce((sum, file) => sum + file.size, 0);
    const limit = isAdmin ? 10 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024; // 10GB for admin, 1GB for users
    const percentage = (used / limit) * 100;

    return { used, limit, percentage };
  }

  /**
   * Validate file upload
   */
  public validateFileUpload(file: Express.Multer.File, username: string, isAdmin: boolean = false): void {
    // Check file size
    const maxFileSize = isAdmin ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for admin, 10MB for users
    if (file.size > maxFileSize) {
      throw new Error(`File size exceeds limit of ${maxFileSize / (1024 * 1024)}MB`);
    }

    // Check storage quota
    const storageUsage = this.getStorageUsage(username, isAdmin);
    if (storageUsage.used + file.size > storageUsage.limit) {
      throw new Error('Storage quota exceeded');
    }

    // Check allowed file types
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

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  // Private helper methods
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }
}

export default FileService;
export interface FileUpload {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  userId: string;
  metadata: FileMetadata;
  versions: FileVersion[];
  tags: string[];
  isPublic: boolean;
  uploadedAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  scanStatus: VirusScanStatus;
  scanResult?: VirusScanResult;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  compression?: string;
  description?: string;
  author?: string;
  copyright?: string;
  location?: GeoLocation;
  exif?: Record<string, any>;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface FileVersion {
  id: string;
  version: number;
  filename: string;
  size: number;
  createdAt: Date;
  checksum: string;
}

export interface ChunkedUpload {
  id: string;
  totalChunks: number;
  uploadedChunks: number;
  totalSize: number;
  filename: string;
  mimetype: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  chunks: ChunkInfo[];
}

export interface ChunkInfo {
  index: number;
  size: number;
  checksum: string;
  uploaded: boolean;
}

export interface StorageProvider {
  name: string;
  upload(file: Express.Multer.File, options: UploadOptions): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  copy(sourceKey: string, destKey: string): Promise<void>;
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
  encryption?: boolean;
}

export interface ProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    quality?: number;
  };
  compress?: {
    quality?: number;
    progressive?: boolean;
  };
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
}

export interface VirusScanStatus {
  status: 'pending' | 'scanning' | 'clean' | 'infected' | 'error';
  scannedAt?: Date;
  engine?: string;
  version?: string;
}

export interface VirusScanResult {
  isClean: boolean;
  threats?: string[];
  engine: string;
  version: string;
  scannedAt: Date;
}

export interface FilePermissions {
  owner: string;
  readers: string[];
  writers: string[];
  isPublic: boolean;
  shareUrl?: string;
  shareExpiresAt?: Date;
}

export interface CDNConfiguration {
  provider: 'cloudfront' | 'cloudflare' | 'fastly' | 'azure-cdn';
  distributionId: string;
  domain: string;
  cacheTtl: number;
  edgeLocations: string[];
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  uploadTrends: Array<{
    date: string;
    count: number;
    size: number;
  }>;
  storageDistribution: Array<{
    provider: string;
    fileCount: number;
    totalSize: number;
  }>;
}

export interface FileSearchQuery {
  query?: string;
  mimetype?: string;
  minSize?: number;
  maxSize?: number;
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  tags?: string[];
  userId?: string;
  isPublic?: boolean;
  sortBy?: 'uploadedAt' | 'size' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
import { StorageProvider } from '@/types/file.types';

export interface StorageConfig {
  defaultProvider: string;
  providers: {
    local: LocalStorageConfig;
    s3: S3StorageConfig;
    azure: AzureStorageConfig;
  };
  cdn: CDNConfig;
  processing: ProcessingConfig;
  security: SecurityConfig;
}

export interface LocalStorageConfig {
  enabled: boolean;
  basePath: string;
  maxFileSize: number;
  allowedTypes: string[];
  cleanupInterval: number;
}

export interface S3StorageConfig {
  enabled: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  pathStyle?: boolean;
  maxFileSize: number;
  multipartThreshold: number;
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
  };
}

export interface AzureStorageConfig {
  enabled: boolean;
  connectionString: string;
  containerName: string;
  maxFileSize: number;
  encryption: {
    enabled: boolean;
    keyVaultUrl?: string;
  };
}

export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudfront' | 'cloudflare' | 'azure-cdn';
  distributionId: string;
  domain: string;
  cacheTtl: number;
  invalidationEnabled: boolean;
}

export interface ProcessingConfig {
  imageProcessing: {
    enabled: boolean;
    maxDimensions: { width: number; height: number };
    thumbnailSizes: Array<{ width: number; height: number; suffix: string }>;
    formats: string[];
    quality: {
      jpeg: number;
      webp: number;
      png: number;
    };
  };
  videoProcessing: {
    enabled: boolean;
    maxDuration: number;
    thumbnailCount: number;
    formats: string[];
    compressionPresets: string[];
  };
}

export interface SecurityConfig {
  virusScanning: {
    enabled: boolean;
    engine: 'clamav' | 'virustotal';
    quarantineInfected: boolean;
    scanTimeout: number;
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotationInterval: number;
  };
  validation: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    blockedExtensions: string[];
    scanFileContent: boolean;
  };
}

export const storageConfig: StorageConfig = {
  defaultProvider: process.env.DEFAULT_STORAGE_PROVIDER || 'local',
  providers: {
    local: {
      enabled: process.env.LOCAL_STORAGE_ENABLED === 'true',
      basePath: process.env.LOCAL_STORAGE_PATH || '/var/www/storage/files',
      maxFileSize: parseInt(process.env.LOCAL_MAX_FILE_SIZE || '104857600'), // 100MB
      allowedTypes: (process.env.ALLOWED_FILE_TYPES || '').split(','),
      cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '86400000'), // 24 hours
    },
    s3: {
      enabled: process.env.S3_ENABLED === 'true',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || '',
      endpoint: process.env.S3_ENDPOINT,
      pathStyle: process.env.S3_PATH_STYLE === 'true',
      maxFileSize: parseInt(process.env.S3_MAX_FILE_SIZE || '5368709120'), // 5GB
      multipartThreshold: parseInt(process.env.S3_MULTIPART_THRESHOLD || '104857600'), // 100MB
      encryption: {
        enabled: process.env.S3_ENCRYPTION_ENABLED === 'true',
        kmsKeyId: process.env.S3_KMS_KEY_ID,
      },
    },
    azure: {
      enabled: process.env.AZURE_ENABLED === 'true',
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
      containerName: process.env.AZURE_CONTAINER_NAME || 'files',
      maxFileSize: parseInt(process.env.AZURE_MAX_FILE_SIZE || '5368709120'), // 5GB
      encryption: {
        enabled: process.env.AZURE_ENCRYPTION_ENABLED === 'true',
        keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
      },
    },
  },
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider: (process.env.CDN_PROVIDER as any) || 'cloudfront',
    distributionId: process.env.CDN_DISTRIBUTION_ID || '',
    domain: process.env.CDN_DOMAIN || '',
    cacheTtl: parseInt(process.env.CDN_CACHE_TTL || '31536000'), // 1 year
    invalidationEnabled: process.env.CDN_INVALIDATION_ENABLED === 'true',
  },
  processing: {
    imageProcessing: {
      enabled: process.env.IMAGE_PROCESSING_ENABLED === 'true',
      maxDimensions: {
        width: parseInt(process.env.IMAGE_MAX_WIDTH || '4096'),
        height: parseInt(process.env.IMAGE_MAX_HEIGHT || '4096'),
      },
      thumbnailSizes: [
        { width: 150, height: 150, suffix: 'thumb' },
        { width: 300, height: 300, suffix: 'small' },
        { width: 800, height: 600, suffix: 'medium' },
        { width: 1920, height: 1080, suffix: 'large' },
      ],
      formats: ['jpeg', 'png', 'webp', 'avif'],
      quality: {
        jpeg: 85,
        webp: 80,
        png: 90,
      },
    },
    videoProcessing: {
      enabled: process.env.VIDEO_PROCESSING_ENABLED === 'true',
      maxDuration: parseInt(process.env.VIDEO_MAX_DURATION || '3600'), // 1 hour
      thumbnailCount: parseInt(process.env.VIDEO_THUMBNAIL_COUNT || '10'),
      formats: ['mp4', 'webm'],
      compressionPresets: ['ultrafast', 'fast', 'medium', 'slow'],
    },
  },
  security: {
    virusScanning: {
      enabled: process.env.VIRUS_SCANNING_ENABLED === 'true',
      engine: (process.env.VIRUS_SCAN_ENGINE as any) || 'clamav',
      quarantineInfected: process.env.QUARANTINE_INFECTED === 'true',
      scanTimeout: parseInt(process.env.VIRUS_SCAN_TIMEOUT || '30000'), // 30 seconds
    },
    encryption: {
      enabled: process.env.FILE_ENCRYPTION_ENABLED === 'true',
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyRotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '2592000000'), // 30 days
    },
    validation: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
      allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || '').split(',').filter(Boolean),
      blockedExtensions: (process.env.BLOCKED_EXTENSIONS || 'exe,bat,cmd,scr,com,pif').split(','),
      scanFileContent: process.env.SCAN_FILE_CONTENT === 'true',
    },
  },
};
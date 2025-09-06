import { PublicAccessType, BlobSASPermissions } from '@azure/storage-blob';

export interface AzureUploadOptions {
  blobHTTPHeaders: {
    blobContentType: string;
    blobCacheControl: string;
  };
  metadata: Record<string, string>;
  encryptionScope?: string;
}

export interface AzureContainerConfig {
  containerName: string;
  access: PublicAccessType | undefined;
}

export interface AzureSASConfig {
  permissions: BlobSASPermissions | string;
  expiresOn: Date;
  contentType?: string;
}

// Type-safe wrapper for Azure operations
export interface AzureOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
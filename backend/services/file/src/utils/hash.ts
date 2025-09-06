import crypto from 'crypto';

export const generateHash = async (data: string, secret: string): Promise<string> => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

export const generateFileHash = async (buffer: Buffer, algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'): Promise<string> => {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
};

export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateSecureFilename = (originalName: string): string => {
  const extension = originalName.split('.').pop() || '';
  const randomString = generateRandomString(16);
  const timestamp = Date.now();
  return `${timestamp}-${randomString}.${extension}`;
};
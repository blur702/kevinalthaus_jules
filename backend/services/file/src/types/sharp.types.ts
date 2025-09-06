// Sharp type definitions for watermark positioning
export type WatermarkGravity = 'northwest' | 'northeast' | 'southwest' | 'southeast' | 'center';

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  channels?: number;
  hasAlpha?: boolean;
  density?: number;
  chromaSubsampling?: string;
  isProgressive?: boolean;
}

export interface ProcessingResult {
  buffer: Buffer;
  info: {
    format: string;
    width: number;
    height: number;
    channels: number;
    premultiplied: boolean;
    size: number;
  };
}
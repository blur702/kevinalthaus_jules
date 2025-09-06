import sharp from 'sharp';
import { ProcessingOptions, FileMetadata } from '@/types/file.types';
import { storageConfig } from '@/config/storage.config';
import { logger } from '@/utils/logger';
import { WatermarkGravity, ImageMetadata } from '@/types/sharp.types';
import { toErrorWithMessage } from '@/types/express.types';
import fs from 'fs/promises';
import path from 'path';

export class ImageProcessorService {
  private config = storageConfig.processing.imageProcessing;

  async processImage(
    inputBuffer: Buffer,
    options: ProcessingOptions,
    metadata: Partial<FileMetadata> = {}
  ): Promise<{
    processedBuffer: Buffer;
    metadata: FileMetadata;
    thumbnails: Array<{ size: string; buffer: Buffer }>;
  }> {
    try {
      const image = sharp(inputBuffer);
      const imageMetadata = await image.metadata();

      // Validate image dimensions
      if (
        (imageMetadata.width && imageMetadata.width > this.config.maxDimensions.width) ||
        (imageMetadata.height && imageMetadata.height > this.config.maxDimensions.height)
      ) {
        throw new Error(
          `Image dimensions exceed maximum allowed size: ${this.config.maxDimensions.width}x${this.config.maxDimensions.height}`
        );
      }

      let processedImage = image;

      // Apply resize if specified
      if (options.resize) {
        processedImage = processedImage.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'cover',
          withoutEnlargement: true,
        });
      }

      // Apply watermark if specified
      if (options.watermark) {
        processedImage = await this.applyWatermark(processedImage, options.watermark);
      }

      // Set output format and quality
      const outputFormat = options.format || 'jpeg';
      const quality = this.getQualityForFormat(outputFormat, options.compress?.quality);

      switch (outputFormat) {
        case 'jpeg':
          processedImage = processedImage.jpeg({
            quality,
            progressive: options.compress?.progressive || false,
          });
          break;
        case 'png':
          processedImage = processedImage.png({
            quality,
            progressive: options.compress?.progressive || false,
          });
          break;
        case 'webp':
          processedImage = processedImage.webp({
            quality,
            effort: 4,
          });
          break;
        case 'avif':
          processedImage = processedImage.avif({
            quality,
            effort: 4,
          });
          break;
      }

      const processedBuffer = await processedImage.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      // Generate thumbnails
      const thumbnails = await this.generateThumbnails(inputBuffer);

      // Build comprehensive metadata
      const completeMetadata: FileMetadata = {
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format,
        colorSpace: processedMetadata.space,
        hasAlpha: processedMetadata.hasAlpha,
        compression: processedMetadata.compression,
        ...metadata,
        exif: await this.extractExifData(inputBuffer),
      };

      logger.info(
        `Image processed: ${imageMetadata.width}x${imageMetadata.height} -> ${processedMetadata.width}x${processedMetadata.height}`
      );

      return {
        processedBuffer,
        metadata: completeMetadata,
        thumbnails,
      };
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Image processing error:', errorWithMessage);
      throw new Error(`Image processing failed: ${errorWithMessage.message}`);
    }
  }

  private async applyWatermark(
    image: sharp.Sharp,
    watermarkOptions: ProcessingOptions['watermark']
  ): Promise<sharp.Sharp> {
    if (!watermarkOptions) return image;

    try {
      if (watermarkOptions.text) {
        // Text watermark
        const svgText = `
          <svg width="200" height="50">
            <text x="10" y="30" font-family="Arial" font-size="20" fill="white" fill-opacity="${watermarkOptions.opacity || 0.5}">
              ${watermarkOptions.text}
            </text>
          </svg>
        `;

        const textBuffer = Buffer.from(svgText);
        return image.composite([
          {
            input: textBuffer,
            gravity: this.getGravityFromPosition(watermarkOptions.position || 'bottom-right'),
          },
        ]);
      } else if (watermarkOptions.image) {
        // Image watermark
        const watermarkBuffer = await fs.readFile(watermarkOptions.image);
        const watermarkImage = sharp(watermarkBuffer);

        // Adjust opacity if specified
        if (watermarkOptions.opacity && watermarkOptions.opacity < 1) {
          const opacity = Math.round(watermarkOptions.opacity * 255);
          watermarkImage.modulate({ brightness: 1 - watermarkOptions.opacity });
        }

        const watermarkBufferProcessed = await watermarkImage.toBuffer();

        return image.composite([
          {
            input: watermarkBufferProcessed,
            gravity: this.getGravityFromPosition(watermarkOptions.position || 'bottom-right'),
          },
        ]);
      }

      return image;
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.warn('Watermark application failed:', errorWithMessage);
      return image; // Return original image if watermark fails
    }
  }

  private getGravityFromPosition(position: string): WatermarkGravity {
    const gravityMap: Record<string, WatermarkGravity> = {
      'top-left': 'northwest',
      'top-right': 'northeast',
      'bottom-left': 'southwest',
      'bottom-right': 'southeast',
      'center': 'center',
    };

    return gravityMap[position] || 'southeast';
  }

  private getQualityForFormat(format: string, customQuality?: number): number {
    if (customQuality) return Math.max(10, Math.min(100, customQuality));

    const defaultQualities = this.config.quality;
    switch (format) {
      case 'jpeg':
        return defaultQualities.jpeg;
      case 'webp':
        return defaultQualities.webp;
      case 'png':
        return defaultQualities.png;
      default:
        return 85;
    }
  }

  private async generateThumbnails(inputBuffer: Buffer): Promise<Array<{ size: string; buffer: Buffer }>> {
    const thumbnails: Array<{ size: string; buffer: Buffer }> = [];

    for (const thumbnailSize of this.config.thumbnailSizes) {
      try {
        const thumbnailBuffer = await sharp(inputBuffer)
          .resize({
            width: thumbnailSize.width,
            height: thumbnailSize.height,
            fit: 'cover',
            withoutEnlargement: true,
          })
          .jpeg({ quality: this.config.quality.jpeg })
          .toBuffer();

        thumbnails.push({
          size: thumbnailSize.suffix,
          buffer: thumbnailBuffer,
        });
      } catch (error) {
        const errorWithMessage = toErrorWithMessage(error);
        logger.warn(`Failed to generate ${thumbnailSize.suffix} thumbnail:`, errorWithMessage);
      }
    }

    return thumbnails;
  }

  private async extractExifData(inputBuffer: Buffer): Promise<Record<string, any>> {
    try {
      const metadata = await sharp(inputBuffer).metadata();
      return {
        exif: metadata.exif,
        icc: metadata.icc,
        iptc: metadata.iptc,
        xmp: metadata.xmp,
        orientation: metadata.orientation,
        density: metadata.density,
        chromaSubsampling: metadata.chromaSubsampling,
        isProgressive: metadata.isProgressive,
      };
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.warn('EXIF extraction failed:', errorWithMessage);
      return {};
    }
  }

  async optimizeForWeb(inputBuffer: Buffer): Promise<{
    webp: Buffer;
    jpeg: Buffer;
    avif?: Buffer;
    originalSize: number;
    optimizedSizes: Record<string, number>;
  }> {
    try {
      const originalSize = inputBuffer.length;
      const optimizedSizes: Record<string, number> = {};

      // Generate WebP version
      const webpBuffer = await sharp(inputBuffer)
        .webp({ quality: this.config.quality.webp, effort: 4 })
        .toBuffer();
      optimizedSizes.webp = webpBuffer.length;

      // Generate optimized JPEG version
      const jpegBuffer = await sharp(inputBuffer)
        .jpeg({
          quality: this.config.quality.jpeg,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
      optimizedSizes.jpeg = jpegBuffer.length;

      // Generate AVIF version if supported
      let avifBuffer: Buffer | undefined;
      try {
        avifBuffer = await sharp(inputBuffer)
          .avif({ quality: 75, effort: 4 })
          .toBuffer();
        optimizedSizes.avif = avifBuffer.length;
      } catch (error) {
        const errorWithMessage = toErrorWithMessage(error);
        logger.warn('AVIF optimization failed (not supported):', errorWithMessage);
      }

      logger.info(
        `Web optimization complete. Original: ${originalSize} bytes, WebP: ${optimizedSizes.webp} bytes, JPEG: ${optimizedSizes.jpeg} bytes`
      );

      return {
        webp: webpBuffer,
        jpeg: jpegBuffer,
        avif: avifBuffer,
        originalSize,
        optimizedSizes,
      };
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Web optimization error:', errorWithMessage);
      throw new Error(`Web optimization failed: ${errorWithMessage.message}`);
    }
  }

  async createResponsiveImages(
    inputBuffer: Buffer,
    breakpoints: Array<{ width: number; suffix: string }>
  ): Promise<Array<{ suffix: string; buffer: Buffer; width: number; height: number }>> {
    const responsiveImages: Array<{ suffix: string; buffer: Buffer; width: number; height: number }> = [];

    for (const breakpoint of breakpoints) {
      try {
        const resizedImage = sharp(inputBuffer).resize({
          width: breakpoint.width,
          withoutEnlargement: true,
          fit: 'inside',
        });

        const metadata = await resizedImage.metadata();
        const buffer = await resizedImage
          .jpeg({ quality: this.config.quality.jpeg, progressive: true })
          .toBuffer();

        responsiveImages.push({
          suffix: breakpoint.suffix,
          buffer,
          width: metadata.width || breakpoint.width,
          height: metadata.height || 0,
        });
      } catch (error) {
        const errorWithMessage = toErrorWithMessage(error);
        logger.warn(`Failed to create responsive image for ${breakpoint.suffix}:`, errorWithMessage);
      }
    }

    return responsiveImages;
  }

  async analyzeImage(inputBuffer: Buffer): Promise<{
    dimensions: { width: number; height: number };
    format: string;
    size: number;
    hasTransparency: boolean;
    colorProfile: string;
    isAnimated: boolean;
    dominantColors: string[];
  }> {
    try {
      const metadata = await sharp(inputBuffer).metadata();
      const stats = await sharp(inputBuffer).stats();

      return {
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
        format: metadata.format || 'unknown',
        size: inputBuffer.length,
        hasTransparency: metadata.hasAlpha || false,
        colorProfile: metadata.space || 'unknown',
        isAnimated: (metadata as any).pages > 1 || false,
        dominantColors: stats.dominant ? [`rgb(${stats.dominant.r},${stats.dominant.g},${stats.dominant.b})`] : [],
      };
    } catch (error) {
      const errorWithMessage = toErrorWithMessage(error);
      logger.error('Image analysis error:', errorWithMessage);
      throw new Error(`Image analysis failed: ${errorWithMessage.message}`);
    }
  }

  isImageFormat(mimetype: string): boolean {
    const imageFormats = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'image/avif',
      'image/heic',
      'image/heif',
    ];

    return imageFormats.includes(mimetype.toLowerCase());
  }

  getSupportedFormats(): string[] {
    return this.config.formats;
  }
}
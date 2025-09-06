import { VirusScanResult, VirusScanStatus } from '@/types/file.types';
import { toErrorWithMessage } from '@/types/express.types';
import { VirusTotalReportResponse, VirusTotalUploadResponse } from '@/types/virustotal.types';
import { storageConfig } from '@/config/storage.config';
import { logger } from '@/utils/logger';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class VirusScannerService {
  private config = storageConfig.security.virusScanning;

  constructor() {
    if (this.config.enabled) {
      this.initializeScanner();
    }
  }

  private async initializeScanner(): Promise<void> {
    try {
      if (this.config.engine === 'clamav') {
        await this.checkClamAVInstallation();
      }
      logger.info(`Virus scanner initialized: ${this.config.engine}`);
    } catch (error) {
      logger.error('Failed to initialize virus scanner:', error);
    }
  }

  private async checkClamAVInstallation(): Promise<void> {
    try {
      await execAsync('clamscan --version');
    } catch (error) {
      throw new Error('ClamAV is not installed or not accessible');
    }
  }

  async scanFile(filePath: string): Promise<VirusScanResult> {
    if (!this.config.enabled) {
      return {
        isClean: true,
        engine: 'disabled',
        version: '0.0.0',
        scannedAt: new Date(),
      };
    }

    try {
      switch (this.config.engine) {
        case 'clamav':
          return await this.scanWithClamAV(filePath);
        case 'virustotal':
          return await this.scanWithVirusTotal(filePath);
        default:
          throw new Error(`Unsupported virus scanner engine: ${this.config.engine}`);
      }
    } catch (error) {
      logger.error('Virus scan error:', error);
      return {
        isClean: false,
        threats: [`Scan error: ${toErrorWithMessage(error).message}`],
        engine: this.config.engine,
        version: 'unknown',
        scannedAt: new Date(),
      };
    }
  }

  private async scanWithClamAV(filePath: string): Promise<VirusScanResult> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Get ClamAV version
      const { stdout: versionOutput } = await execAsync('clamscan --version');
      const version = versionOutput.trim().split(' ')[1] || 'unknown';

      // Scan the file with timeout
      const scanCommand = `timeout ${this.config.scanTimeout / 1000}s clamscan --no-summary "${filePath}"`;
      
      try {
        const { stdout } = await execAsync(scanCommand);
        
        if (stdout.includes('FOUND')) {
          const threats = this.extractThreatsFromClamAV(stdout);
          return {
            isClean: false,
            threats,
            engine: 'clamav',
            version,
            scannedAt: new Date(),
          };
        }

        return {
          isClean: true,
          engine: 'clamav',
          version,
          scannedAt: new Date(),
        };
      } catch (scanError) {
        const errorWithMessage = toErrorWithMessage(scanError);
        // Check if it's a timeout or actual threat detection
        if (errorWithMessage.message.includes('FOUND')) {
          const threats = this.extractThreatsFromClamAV(errorWithMessage.message);
          return {
            isClean: false,
            threats,
            engine: 'clamav',
            version,
            scannedAt: new Date(),
          };
        }
        
        throw scanError;
      }
    } catch (error) {
      logger.error('ClamAV scan error:', error);
      throw new Error(`ClamAV scan failed: ${toErrorWithMessage(error).message}`);
    }
  }

  private extractThreatsFromClamAV(output: string): string[] {
    const lines = output.split('\n');
    const threats: string[] = [];

    for (const line of lines) {
      if (line.includes('FOUND')) {
        const match = line.match(/:\s*(.+)\s+FOUND/);
        if (match && match[1]) {
          threats.push(match[1].trim());
        }
      }
    }

    return threats.length > 0 ? threats : ['Unknown threat detected'];
  }

  private async scanWithVirusTotal(filePath: string): Promise<VirusScanResult> {
    try {
      const apiKey = process.env.VIRUSTOTAL_API_KEY;
      if (!apiKey) {
        throw new Error('VirusTotal API key not configured');
      }

      // Read file and calculate hash
      const fileBuffer = await fs.readFile(filePath);
      const crypto = require('crypto');
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check if file was already scanned
      const reportResponse = await fetch(`https://www.virustotal.com/vtapi/v2/file/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: apiKey,
          resource: sha256,
        }),
      });

      const reportData = await reportResponse.json() as VirusTotalReportResponse;

      if (reportData.response_code === 1) {
        // File was already scanned
        return {
          isClean: reportData.positives === 0,
          threats: reportData.positives > 0 ? [`${reportData.positives} engines detected threats`] : undefined,
          engine: 'virustotal',
          version: 'v2',
          scannedAt: reportData.scan_date ? new Date(reportData.scan_date) : new Date(),
        };
      }

      // Upload file for scanning (for files < 32MB)
      if (fileBuffer.length > 32 * 1024 * 1024) {
        throw new Error('File too large for VirusTotal API');
      }

      const formData = new FormData();
      formData.append('apikey', apiKey);
      formData.append('file', new Blob([fileBuffer]), path.basename(filePath));

      const uploadResponse = await fetch('https://www.virustotal.com/vtapi/v2/file/scan', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json() as VirusTotalUploadResponse;

      if (uploadData.response_code !== 1) {
        throw new Error('Failed to upload file to VirusTotal');
      }

      // Wait for scan to complete (simplified - in production, implement proper polling)
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      // Get scan result
      const finalReportResponse = await fetch(`https://www.virustotal.com/vtapi/v2/file/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: apiKey,
          resource: uploadData.resource,
        }),
      });

      const finalReportData = await finalReportResponse.json() as VirusTotalReportResponse;

      return {
        isClean: finalReportData.positives === 0,
        threats: finalReportData.positives > 0 ? [`${finalReportData.positives} engines detected threats`] : undefined,
        engine: 'virustotal',
        version: 'v2',
        scannedAt: new Date(),
      };
    } catch (error) {
      logger.error('VirusTotal scan error:', error);
      throw new Error(`VirusTotal scan failed: ${toErrorWithMessage(error).message}`);
    }
  }

  async scanBuffer(buffer: Buffer, filename: string): Promise<VirusScanResult> {
    // Create temporary file for scanning
    const tempDir = '/tmp/virus-scan';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFile = path.join(tempDir, `${Date.now()}-${filename}`);
    
    try {
      await fs.writeFile(tempFile, buffer);
      return await this.scanFile(tempFile);
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(tempFile);
      } catch (error) {
        logger.warn('Failed to clean up temp scan file:', error);
      }
    }
  }

  async updateVirusDefinitions(): Promise<void> {
    if (!this.config.enabled || this.config.engine !== 'clamav') {
      return;
    }

    try {
      logger.info('Updating virus definitions...');
      await execAsync('freshclam');
      logger.info('Virus definitions updated successfully');
    } catch (error) {
      logger.error('Failed to update virus definitions:', error);
      throw new Error(`Failed to update virus definitions: ${toErrorWithMessage(error).message}`);
    }
  }

  async quarantineFile(filePath: string): Promise<string> {
    if (!this.config.quarantineInfected) {
      return filePath;
    }

    const quarantineDir = '/var/quarantine';
    await fs.mkdir(quarantineDir, { recursive: true });

    const quarantineFile = path.join(quarantineDir, `${Date.now()}-${path.basename(filePath)}`);
    
    try {
      await fs.rename(filePath, quarantineFile);
      logger.info(`File quarantined: ${filePath} -> ${quarantineFile}`);
      return quarantineFile;
    } catch (error) {
      logger.error('Failed to quarantine file:', error);
      throw new Error(`Failed to quarantine file: ${toErrorWithMessage(error).message}`);
    }
  }

  async getQuarantinedFiles(): Promise<Array<{ filename: string; quarantinedAt: Date; size: number }>> {
    const quarantineDir = '/var/quarantine';
    
    try {
      const files = await fs.readdir(quarantineDir);
      const quarantinedFiles: Array<{ filename: string; quarantinedAt: Date; size: number }> = [];

      for (const file of files) {
        const filePath = path.join(quarantineDir, file);
        const stats = await fs.stat(filePath);
        
        quarantinedFiles.push({
          filename: file,
          quarantinedAt: stats.mtime,
          size: stats.size,
        });
      }

      return quarantinedFiles.sort((a, b) => b.quarantinedAt.getTime() - a.quarantinedAt.getTime());
    } catch (error) {
      logger.error('Failed to list quarantined files:', error);
      return [];
    }
  }

  async deleteQuarantinedFile(filename: string): Promise<void> {
    const quarantineDir = '/var/quarantine';
    const filePath = path.join(quarantineDir, filename);

    try {
      await fs.unlink(filePath);
      logger.info(`Quarantined file deleted: ${filename}`);
    } catch (error) {
      logger.error('Failed to delete quarantined file:', error);
      throw new Error(`Failed to delete quarantined file: ${toErrorWithMessage(error).message}`);
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getEngineInfo(): { engine: string; version?: string } {
    return {
      engine: this.config.engine,
    };
  }
}
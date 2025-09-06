export interface VirusTotalReportResponse {
  response_code: number;
  positives: number;
  scan_date?: string;
  resource?: string;
  verbose_msg?: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  permalink?: string;
  scans?: Record<string, {
    detected: boolean;
    version: string;
    result: string | null;
    update: string;
  }>;
}

export interface VirusTotalUploadResponse {
  response_code: number;
  verbose_msg: string;
  resource: string;
  scan_id: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  permalink?: string;
}
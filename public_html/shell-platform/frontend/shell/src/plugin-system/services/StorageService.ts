/**
 * StorageService - File storage service for plugins
 */

export class StorageService {
  private apiEndpoint: string = '/api/storage';

  async initialize(): Promise<void> {
    console.log('Storage service initialized');
  }

  async upload(file: File, path?: string): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (path) formData.append('path', path);

    const response = await fetch(`${this.apiEndpoint}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  }

  async delete(fileId: string): Promise<void> {
    const response = await fetch(`${this.apiEndpoint}/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }
  }

  async getUrl(fileId: string): Promise<string> {
    const response = await fetch(`${this.apiEndpoint}/${fileId}/url`);
    
    if (!response.ok) {
      throw new Error('Failed to get URL');
    }

    const data = await response.json();
    return data.url;
  }

  async list(path?: string): Promise<any[]> {
    const url = path 
      ? `${this.apiEndpoint}/list?path=${encodeURIComponent(path)}`
      : `${this.apiEndpoint}/list`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('List failed');
    }

    return await response.json();
  }
}
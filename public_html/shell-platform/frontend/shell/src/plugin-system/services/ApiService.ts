/**
 * ApiService - Handles external API calls for plugins
 */

export class ApiService {
  private baseHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  async initialize(): Promise<void> {
    console.log('API service initialized');
  }

  async get(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'GET',
      headers: { ...this.baseHeaders, ...options?.headers },
      ...options,
    });
  }

  async post(url: string, data?: any, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: { ...this.baseHeaders, ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put(url: string, data?: any, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'PUT',
      headers: { ...this.baseHeaders, ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'DELETE',
      headers: { ...this.baseHeaders, ...options?.headers },
      ...options,
    });
  }

  async patch(url: string, data?: any, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      method: 'PATCH',
      headers: { ...this.baseHeaders, ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  registerEndpoint(endpoint: any): void {
    // Implementation for registering plugin API endpoints
  }

  unregisterEndpoint(key: string): void {
    // Implementation for unregistering plugin API endpoints
  }
}
/**
 * SettingsService - Settings management for plugins
 */

export class SettingsService {
  private settings: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    await this.loadSettings();
  }

  async get(key: string, defaultValue?: any): Promise<any> {
    return this.settings.get(key) ?? defaultValue;
  }

  async set(key: string, value: any): Promise<void> {
    this.settings.set(key, value);
    await this.saveSettings();
  }

  async delete(key: string): Promise<void> {
    this.settings.delete(key);
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    const stored = localStorage.getItem('shell_settings');
    if (stored) {
      const data = JSON.parse(stored);
      Object.entries(data).forEach(([k, v]) => this.settings.set(k, v));
    }
  }

  private async saveSettings(): Promise<void> {
    const data = Object.fromEntries(this.settings);
    localStorage.setItem('shell_settings', JSON.stringify(data));
  }
}

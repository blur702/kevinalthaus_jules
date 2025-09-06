/**
 * I18nService - Internationalization service for plugins
 */

export class I18nService {
  private locale: string = 'en';
  private translations: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    this.loadLocale();
  }

  setLocale(locale: string): void {
    this.locale = locale;
    localStorage.setItem('shell_locale', locale);
  }

  getLocale(): string {
    return this.locale;
  }

  translate(key: string, params?: any): string {
    const translation = this.translations.get(`${this.locale}.${key}`);
    if (!translation) return key;
    
    if (params) {
      return translation.replace(/\{(\w+)\}/g, (_: string, param: string) => params[param] || '');
    }
    
    return translation;
  }

  registerTranslations(locale: string, translations: any): void {
    Object.entries(translations).forEach(([key, value]) => {
      this.translations.set(`${locale}.${key}`, value);
    });
  }

  private loadLocale(): void {
    const saved = localStorage.getItem('shell_locale');
    if (saved) {
      this.locale = saved;
    }
  }
}

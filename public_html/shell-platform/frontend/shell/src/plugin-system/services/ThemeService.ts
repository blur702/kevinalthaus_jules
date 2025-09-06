/**
 * ThemeService - Theme management for plugins
 */

export class ThemeService {
  private currentTheme: string = 'light';
  private themes: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    this.loadTheme();
  }

  setTheme(theme: string): void {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('shell_theme', theme);
  }

  getTheme(): string {
    return this.currentTheme;
  }

  registerTheme(id: string, theme: any): void {
    this.themes.set(id, theme);
  }

  private loadTheme(): void {
    const saved = localStorage.getItem('shell_theme');
    if (saved) {
      this.setTheme(saved);
    }
  }
}

import { AuthService } from './AuthService';
import { PluginService } from './PluginService';
import { FileService } from './FileService';

export { AuthService } from './AuthService';
export { PluginService } from './PluginService';
export { FileService } from './FileService';

// Export service instances for easy access
export const authService = AuthService.getInstance();
export const pluginService = PluginService.getInstance();
export const fileService = FileService.getInstance();
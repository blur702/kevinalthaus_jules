/**
 * PermissionService - Permission management for plugins
 */

export class PermissionService {
  private permissions: Set<string> = new Set();
  
  async initialize(): Promise<void> {
    console.log('Permission service initialized');
  }

  hasPermission(permission: string): boolean {
    return this.permissions.has(permission);
  }

  grantPermission(permission: string): void {
    this.permissions.add(permission);
  }

  revokePermission(permission: string): void {
    this.permissions.delete(permission);
  }

  setPermissions(permissions: string[]): void {
    this.permissions = new Set(permissions);
  }

  getPermissions(): string[] {
    return Array.from(this.permissions);
  }
}

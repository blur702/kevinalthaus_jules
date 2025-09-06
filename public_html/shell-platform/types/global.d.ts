/**
 * Global type definitions for Shell Platform
 */

// Extend ImportMeta to include environment variables
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_DEBUG?: string;
  [key: string]: any;
}

// Module Federation SharedConfig with singleton property
declare module '@originjs/vite-plugin-federation' {
  interface SharedConfig {
    singleton?: boolean;
    requiredVersion?: string;
    shareScope?: string;
    strictVersion?: boolean;
    version?: string;
    shareKey?: string;
    import?: boolean;
  }
}

// React Query DevTools position type fix
declare module '@tanstack/react-query-devtools' {
  type DevtoolsPosition = 
    | 'top-left' 
    | 'top-right' 
    | 'bottom-left' 
    | 'bottom-right';
}

// Global React for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        // Dynamic remotes will be loaded at runtime
        // This will be populated from the plugin registry
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.21.1',
        },
        '@reduxjs/toolkit': {
          singleton: true,
          requiredVersion: '^2.0.1',
        },
        'react-redux': {
          singleton: true,
          requiredVersion: '^9.1.0',
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.17.0',
        },
        axios: {
          singleton: true,
          requiredVersion: '^1.6.5',
        },
        'lucide-react': {
          singleton: true,
          requiredVersion: '^0.306.0',
        },
        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.48.2',
        },
        'react-hot-toast': {
          singleton: true,
          requiredVersion: '^2.4.1',
        },
        clsx: {
          singleton: true,
          requiredVersion: '^2.0.0',
        },
        'tailwind-merge': {
          singleton: true,
          requiredVersion: '^2.2.0',
        },
      },
      exposes: {
        './shared-components': '../shared-components/src/index.ts',
        './plugin-types': './src/types/plugin.types.ts',
        './plugin-base': './src/core/plugin-system/PluginBase.ts',
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      external: [],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '../shared-components/src',
    },
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'user_management_plugin',
      filename: 'remoteEntry.js',
      exposes: {
        './UserManagementPlugin': './src/UserManagementPlugin.tsx',
      },
      shared: {
        react: {
          singleton: true,
        },
        'react-dom': {
          singleton: true,
        },
        'react-hook-form': {
          singleton: true,
        },
        'lucide-react': {
          singleton: true,
        },
        clsx: {
          singleton: true,
        }
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3002,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization, X-Requested-With'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3002,
    cors: true,
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom']
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
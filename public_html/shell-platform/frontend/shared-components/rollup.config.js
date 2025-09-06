import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';

const packageJson = require('./package.json');

export default {
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.*', '**/*.stories.*', 'node_modules/**'],
    }),
    postcss({
      extract: true,
      minimize: true,
    }),
    terser(),
  ],
  external: [
    'react',
    'react-dom',
    '@mui/material',
    '@mui/icons-material',
    '@mui/x-data-grid',
    '@mui/x-date-pickers',
    '@emotion/react',
    '@emotion/styled',
  ],
};
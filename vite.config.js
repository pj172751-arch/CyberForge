import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)/,
              priority: 30,
            },
            {
              name: 'three-core',
              test: /node_modules[\\/]three[\\/]build[\\/]three\.core/,
              priority: 27,
            },
            {
              name: 'three-webgl',
              test: /node_modules[\\/]three/,
              priority: 25,
            },
            {
              name: 'motion-vendor',
              test: /node_modules[\\/](gsap|lenis)/,
              priority: 20,
            },
            {
              name: 'physics-vendor',
              test: /node_modules[\\/]matter-js/,
              priority: 18,
            },
            {
              name: 'icons-vendor',
              test: /node_modules[\\/]@phosphor-icons/,
              priority: 15,
            },
            {
              name: 'shared-console',
              minShareCount: 2,
              minSize: 20000,
              priority: 5,
            },
          ],
        },
      },
    },
  },
});

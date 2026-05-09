import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

function copyCesiumPlugin() {
  return {
    name: 'copy-cesium',
    buildStart() {
      const cesiumSource = resolve(__dirname, 'node_modules/cesium/Build/Cesium');
      const cesiumDest = resolve(__dirname, 'public/cesium');
      const dirs = ['Assets', 'Widgets', 'Workers', 'ThirdParty'];

      for (const dir of dirs) {
        const src = resolve(cesiumSource, dir);
        const dest = resolve(cesiumDest, dir);
        if (!fs.existsSync(src)) {
          console.error(`[copy-cesium] Source not found: ${src}`);
          continue;
        }
        fs.mkdirSync(dest, { recursive: true });
        copyDir(src, dest);
        console.log(`[copy-cesium] Copied ${dir} -> ${dest}`);
      }
    }
  };
}

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  plugins: [react(), copyCesiumPlugin()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      cesium: 'cesium',
    },
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium/'),
  },
  optimizeDeps: {
    include: ['cesium'],
  },
});

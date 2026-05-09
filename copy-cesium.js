const fs = require('fs');
const path = require('path');

const cesiumSource = path.join(__dirname, 'node_modules/cesium/Build/Cesium');
const cesiumDest = path.join(__dirname, 'public/cesium');

const dirs = ['Assets', 'Widgets', 'Workers', 'ThirdParty'];

dirs.forEach(dir => {
  const src = path.join(cesiumSource, dir);
  const dest = path.join(cesiumDest, dir);

  if (!fs.existsSync(src)) {
    console.error(`Source directory not found: ${src}`);
    process.exit(1);
  }

  fs.mkdirSync(dest, { recursive: true });

  function copyRecursive(source, target) {
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyRecursive(src, dest);
  console.log(`Copied ${dir} -> ${dest}`);
});

console.log('Cesium assets copied successfully!');

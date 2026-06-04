const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const targets = ['views', 'public'];

const copyDir = (source, destination) => {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
};

fs.mkdirSync(distDir, { recursive: true });

for (const target of targets) {
  const source = path.join(rootDir, target);
  const destination = path.join(distDir, target);
  if (!fs.existsSync(source)) {
    continue;
  }
  copyDir(source, destination);
}

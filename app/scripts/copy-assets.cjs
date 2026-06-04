const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const targets = ["views", "public"];

for (const target of targets) {
  const source = path.join(rootDir, target);
  const destination = path.join(distDir, target);
  if (!fs.existsSync(source)) {
    continue;
  }
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}

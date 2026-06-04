const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const targets = ["views", "public"];

const removableErrorCodes = new Set(["ENOTEMPTY", "EBUSY", "EPERM"]);

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function removeWithRetry(targetPath) {
  const attempts = 5;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (error) {
      if (!removableErrorCodes.has(error.code) || attempt === attempts) {
        throw error;
      }

      sleep(100 * attempt);
    }
  }
}

for (const target of targets) {
  const source = path.join(rootDir, target);
  const destination = path.join(distDir, target);
  if (!fs.existsSync(source)) {
    continue;
  }
  removeWithRetry(destination);
  fs.cpSync(source, destination, { recursive: true });
}

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");

const files = [
  "index.html",
  "launcher.css",
  "launcher.js",
  "i18n.js",
  "manifest.webmanifest",
  "sw.js",
  "PRIVACY.md",
  "README.md",
  "STORE_PREP.md",
];

const directories = ["games", "icons"];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing required folder: ${relativePath}`);
  }

  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: (entry) => !entry.endsWith(".DS_Store") && !entry.endsWith("Thumbs.db"),
  });
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

files.forEach(copyFile);
directories.forEach(copyDirectory);

console.log("Built www app bundle.");

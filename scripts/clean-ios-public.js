const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "ios", "App", "App", "public");

if (!publicDir.startsWith(path.join(root, "ios") + path.sep)) {
  throw new Error(`Refusing to clean unexpected path: ${publicDir}`);
}

fs.rmSync(publicDir, { recursive: true, force: true });
console.log("Cleared the previous Capacitor iOS web bundle.");

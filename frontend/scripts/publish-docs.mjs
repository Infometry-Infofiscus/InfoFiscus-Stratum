import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const frontendRoot = resolve(process.cwd());
const outDir = resolve(frontendRoot, "out");
const docsDir = resolve(frontendRoot, "..", "docs");

if (!existsSync(outDir)) {
  console.error("Static export folder not found: frontend/out");
  console.error("Run `npm run build` first.");
  process.exit(1);
}

rmSync(docsDir, { recursive: true, force: true });
mkdirSync(docsDir, { recursive: true });
cpSync(outDir, docsDir, { recursive: true });
writeFileSync(resolve(docsDir, ".nojekyll"), "");

console.log("GitHub Pages output copied to /docs");

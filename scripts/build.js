import { mkdir, cp, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Expected Manifest V3");
await mkdir("dist", { recursive: true });
for (const file of ["manifest.json", "index.html", "styles.css", "src"]) {
  await cp(file, `dist/${file}`, { recursive: true });
}
console.log("Extension ready: load the dist folder in Chrome or Edge.");

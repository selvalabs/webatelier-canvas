import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const directory = resolve("src/webdesign_ai_editor/static");
const files = readdirSync(directory)
  .filter((name) => name.startsWith("editor-") && name.endsWith(".js"))
  .sort();

for (const file of files) {
  const path = resolve(directory, file);
  const result = spawnSync(process.execPath, ["--check", path], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Checked ${files.length} editor runtime JavaScript files.`);

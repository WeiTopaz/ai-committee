import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getAppVersion(): string {
  try {
    const packagePath = join(__dirname, "../package.json");
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

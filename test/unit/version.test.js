import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAppVersion } from "../../dist/version.js";

test("getAppVersion matches package.json", () => {
  const pkgPath = join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  assert.equal(getAppVersion(), pkg.version);
});

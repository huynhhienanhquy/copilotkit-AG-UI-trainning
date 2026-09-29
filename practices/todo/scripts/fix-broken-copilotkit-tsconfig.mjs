import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(
  projectRoot,
  "node_modules",
  "@copilotkit",
  "react-ui",
);
const packageJsonPath = resolve(packageRoot, "package.json");
const vendorTsconfig = resolve(packageRoot, "tsconfig.json");

if (!existsSync(packageJsonPath)) {
  process.exit(0);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

if (packageJson.version !== "1.0.0-beta.2") {
  process.exit(0);
}

const brokenPreset = '"extends": "tsconfig/react-library.json"';
const existingContents = existsSync(vendorTsconfig)
  ? readFileSync(vendorTsconfig, "utf8")
  : "";

if (existingContents && !existingContents.includes(brokenPreset)) {
  process.exit(0);
}

// This package version accidentally publishes a development tsconfig that
// extends a private preset. Keep a valid file at the same path so editors with
// the vendor file already open also discard their stale diagnostic.
const replacement = `${JSON.stringify(
  {
    compilerOptions: {
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["dist/**/*.d.ts"],
  },
  null,
  2,
)}\n`;

writeFileSync(vendorTsconfig, replacement, "utf8");
console.log("Fixed the invalid @copilotkit/react-ui development tsconfig.");

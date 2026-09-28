import { rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mastraDirectory = resolve(projectDirectory, ".mastra");
const outputDirectory = resolve(mastraDirectory, "output");

if (!outputDirectory.startsWith(`${mastraDirectory}${sep}`)) {
  throw new Error(`Refusing to clean unexpected path: ${outputDirectory}`);
}

await rm(outputDirectory, {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 200,
});

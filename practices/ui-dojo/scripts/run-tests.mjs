import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Windows native SQLite statements can retain file handles until the test worker exits.
// Clean the isolated test directory from this parent process after all workers have exited.
const parent = resolve(".practice-test");
await mkdir(parent, { recursive: true });
const directory = await mkdtemp(join(parent, "run-"));
try {
  const command = join(dirname(fileURLToPath(import.meta.resolve("vitest/package.json"))), "vitest.mjs");
  const code = await new Promise((resolveExit, reject) => {
    const child = spawn(process.execPath, [command, "run", ...process.argv.slice(2)], {
      stdio: "inherit", windowsHide: true, env: { ...process.env, PRACTICE_TEST_ROOT: directory },
    });
    child.on("error", reject); child.on("close", resolveExit);
  });
  process.exitCode = code ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

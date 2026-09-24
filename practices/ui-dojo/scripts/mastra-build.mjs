import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Keep the build command portable across Windows and POSIX shells.
const child = spawn(process.execPath, [fileURLToPath(import.meta.resolve("mastra")), "build"], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, PNPM_CONFIG_STRICT_DEP_BUILDS: "false" },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Native LibSQL stores and bounded parser processes share Windows filesystem resources.
  test: { include: ["src/**/*.test.{ts,tsx}"], environment: "node", fileParallelism: false, testTimeout: 30_000, hookTimeout: 30_000 },
});

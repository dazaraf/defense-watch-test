import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Config per docs/TESTING.md. `server-only` throws outside an RSC context,
// which is what a test run looks like, so it is aliased to an empty stub —
// do NOT remove the server-only imports themselves (§11 guardrail).
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": new URL("./test/stubs/empty.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});

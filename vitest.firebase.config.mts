import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Firebase emulator integration suite. Run only through the non-watch
// `npm run test:firebase` script, which wraps `vitest run` inside
// `firebase emulators:exec --project demo-faultsmith` so the tests can never
// contact a real Firebase project.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/firebase/**/*.test.ts"],
    watch: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});

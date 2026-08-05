import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Componentes de Remotion (src/remotion/**) se validan visualmente vía
      // `pnpm studio`, no con tests unitarios — necesitarían mockear el runtime
      // de frames/timeline de Remotion para poco beneficio real.
      exclude: ["src/remotion/**", "src/test/**", "**/*.config.*"],
    },
  },
});

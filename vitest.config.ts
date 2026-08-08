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
      // Threshold enforced solo sobre schema.ts, no un número global sobre todo
      // src/pipeline/**: generate.ts, editPlan.ts y tts.ts mezclan lógica pura ya
      // testeada con I/O externo (ElevenLabs, el CLI headless de `claude`) que no
      // se mockea ni testea por diseño (ver CLAUDE.md) — un piso global rompería
      // en esas ramas de I/O y contradiría esa política en vez de reforzarla.
      // schema.ts son zod schemas puros, cubiertos al 100% por
      // src/test/schema.test.ts, así que sí tiene sentido gatear su regresión.
      thresholds: {
        "src/pipeline/schema.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});

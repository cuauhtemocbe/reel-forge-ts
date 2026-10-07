---
title: sonar-project.properties para análisis SonarQube local
status: in-progress
created: 2026-10-06
updated: 2026-10-06
issue: "#12"
---

# sonar-project.properties para análisis SonarQube local

## Objective

Agregar `sonar-project.properties` en la raíz para que el skill `/sonar-check` (ya
instalado en `.claude/skills/sonar-check/`) pueda correr un análisis SonarQube **local**
sobre este repo, con rutas de fuentes/tests/cobertura que reflejen su layout real. Es un
workflow personal del mantenedor: no es un paso de CI, ni de `make validate`, ni de Husky.

## Context

Los repos hermanos ya usan SonarQube local para detectar code smells y huecos de cobertura
antes de pushear; este no tenía `sonar-project.properties`, y `README.md`/`CLAUDE.md`
decían que SonarQube se había "descartado". El skill queda inutilizable sin el archivo.

Hechos del repo verificados el 2026-10-06 (no solo copiados del issue):

- Fuentes: `src/` — `src/pipeline/` (lógica + I/O), `src/remotion/` (`.tsx` y helpers,
  validados visualmente con `pnpm studio`), `src/cli.ts`.
- Tests: Vitest, solo `src/test/*.test.ts` (5 archivos); sin `.tsx` ni `*.spec.*`.
- Cobertura: `vitest.config.ts` ya emite `["text", "lcov"]` y excluye `src/remotion/**`
  del reporte. `pnpm test:coverage` genera `coverage/lcov.info` con rutas
  repo-relativas `SF:src/pipeline/*.ts` (5 archivos: `constants`, `editPlan`, `generate`,
  `schema`, `tts`). Líneas: 59/163 = 36.19 %.
- Sonar cuenta como 0 % los archivos que no aparecen en el reporte LCOV, así que
  `src/remotion/**` y `src/cli.ts` (sin tests por diseño) arrastrarían el número total si
  no se excluyen de cobertura.

## Requirements

### Functional Requirements

- [x] `sonar-project.properties` en la raíz con `sonar.sources=src`, `sonar.tests=src`,
      `sonar.test.inclusions=src/test/**/*.test.ts`, `sonar.exclusions=src/test/**,...`
      (main y test disjuntos) y `sonar.javascript.lcov.reportPaths=coverage/lcov.info`.
- [x] `sonar.coverage.exclusions` cubre `src/test/**`, `src/remotion/**` y `src/cli.ts`;
      siguen en `sonar.sources` para que Sonar analice code smells ahí.
- [x] `.gitignore` ignora `.scannerwork/` y `.sonarlint/` (`.mcp.json` ya estaba).
- [x] `README.md` y `CLAUDE.md` dicen "SonarQube local-only, fuera de CI / `make validate`
      / pre-push" en vez de "descartado".
- [x] Decisión de quality gate registrada: gate por defecto ("Sonar way"), cobertura
      reportada tal cual (opción 1 del issue).

### Non-Functional Requirements

- [x] Sin cambios a `Makefile`, `.husky/`, CI ni `vitest.config.ts`.
- [x] Sin código de producción ni tests nuevos.

## Architecture

### Components

- **`sonar-project.properties`**: archivo nuevo, único artefacto funcional.
- **`.gitignore`**: dos entradas nuevas (`.scannerwork/`, `.sonarlint/`).
- **`README.md`** (y `CLAUDE.md` local, gitignored): reescritura de la frase "descartado".

### Data Model

N/A.

### External Dependencies

SonarQube Server + `sonar-scanner` dockerizado, ambos vía `/sonar-check` en la máquina
del mantenedor. Ninguna dependencia nueva en `package.json`.

## User Stories

Ver `issue #12` (cuauhtemocbe/reel-forge-ts): criterios de aceptación ahí.

## Testing Strategy

Sin tests automatizados nuevos (configuración de herramienta, no lógica). Verificación:

1. `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage` en verde; `coverage/lcov.info` con
   `SF:src/...` repo-relativos.
2. Simulación local de los globs contra `git ls-files src`: cada archivo cae en
   exactamente uno de main/test (sin doble indexado) y el conjunto "con cobertura
   esperada" coincide con los `SF:` del LCOV.
3. Un escaneo real con `/sonar-check` queda **fuera de esta tarea** (requiere un token de
   usuario `squ_` local); se verifica aparte.

## Boundaries & Constraints

### In Scope

- `sonar-project.properties`, `.gitignore`, wording de `README.md`/`CLAUDE.md`.

### Out of Scope

- Integrar Sonar en `make validate`, `pre-push` o CI (el repo es 100 % local).
- Mocks/tests para las rutas de I/O de ElevenLabs / `claude` CLI (ver #3).
- Quality gate propio o excluir `generate.ts`/`editPlan.ts`/`tts.ts` de cobertura.
- Ejecutar el escaneo, crear `.mcp.json` o tokens.

### Technical Constraints

- Provider de cobertura `v8`; LCOV en `coverage/lcov.info` (default de Vitest).
- `sonar.sources` y `sonar.tests` apuntan ambos a `src`: la separación main/test depende
  de que `sonar.exclusions` y `sonar.test.inclusions` describan el mismo conjunto.

## Success Criteria

- [x] `pnpm typecheck` y `pnpm lint` verdes; `pnpm test:coverage` exit 0.
- [x] Simulación de globs: 0 archivos doble-indexados, 0 sin clasificar.
- [x] `README.md`/`CLAUDE.md` ya no dicen que SonarQube se descartó.
- [ ] Escaneo sin warning "No LCOV files were found" — no verificado: requiere escaneo local.
- [ ] `src/pipeline/schema.ts` al 100 % en SonarQube — no verificado: requiere escaneo local.
- [ ] Sin error "can't be indexed twice" — no verificado: requiere escaneo local.
- [ ] `src/remotion/**` y `src/cli.ts` con code smells pero sin cobertura — no verificado:
      requiere escaneo local.
- [ ] `SONARQUBE_PROJECT_KEY` del MCP local = `reel-forge-ts` y token `squ_` — no
      verificado: configuración local gitignored.

## Implementation Plan

Ver `specs/sonar-project-properties-plan.md`.

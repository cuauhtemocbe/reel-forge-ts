---
title: Coverage floor enforced en pnpm test:coverage
status: completed
created: 2026-08-08
updated: 2026-08-08
issue: "#3"
---

# Coverage floor enforced en pnpm test:coverage

## Objective

Hacer que `pnpm test:coverage` (y por lo tanto `make validate` / el hook `pre-push` a
`main`) falle con status no-cero cuando la cobertura de la lógica pura ya testeada del
pipeline (`src/pipeline/schema.ts`) cae por debajo de un piso configurado, en vez de solo
reportar el número y dejar pasar siempre.

## Context

`vitest.config.ts` configura el provider `v8` con `reporter: ["text", "lcov"]` pero sin
`coverage.thresholds` — hoy `pnpm test:coverage` siempre sale con status `0` sin importar
el número de cobertura. La cobertura se reporta, nunca se enforced. Esto es el gap
concreto que audita `development-standards.md` §5 ("Cobertura mínima enforced, no solo
reportada").

Dentro de `src/pipeline/`, la cobertura hoy es intencionalmente despareja y ya está
documentado en `CLAUDE.md`, no es un bug: las integraciones con ElevenLabs (`tts.ts`) y el
CLI headless de `claude` (`editPlan.ts`) no se mockean ni testean automáticamente por tener
costo por llamada real. Estado actual medido con `pnpm test:coverage`:

| Archivo | % Stmts | Notas |
|---|---|---|
| `schema.ts` | ~100% (no aparece en la tabla — `skipFull` del reporter `text` omite archivos al 100%) | Zod schemas puros, cubiertos por `src/test/schema.test.ts` |
| `tts.ts` | 68.18% | Mezcla `convertWithTimestamps` (I/O, no testeado) con `alignmentToWords` (pura, testeada) |
| `editPlan.ts` | 33.33% | Mezcla `execFile("claude", ...)` (I/O) con `extractJson`/`resolveEditPlanOverride` (puras, testeadas) |
| `generate.ts` | 4.93% | Orquestación + I/O, prácticamente sin testear por diseño |

Un threshold global único sobre todo `src/pipeline/**` rompería inmediatamente en
`generate.ts`/`editPlan.ts` por sus ramas de I/O deliberadamente no testeadas —
contradiciendo la política ya existente en vez de reforzarla.

## Requirements

### Functional Requirements

- [ ] `vitest.config.ts` agrega `coverage.thresholds` con un threshold por-glob sobre
      `src/pipeline/schema.ts` (100% en statements/branches/functions/lines, reflejando su
      cobertura real actual).
- [ ] `generate.ts`, `editPlan.ts` y `tts.ts` no tienen threshold asignado — el gate no los
      bloquea por sus ramas de I/O no testeadas.
- [ ] Si `schema.ts` regresa por debajo del threshold, `pnpm test:coverage` sale con status
      no-cero y el output nombra el archivo y la métrica que falló.
- [ ] Si toda la cobertura se mantiene igual o por encima de los thresholds configurados,
      `pnpm test:coverage` sale con status `0` y sigue imprimiendo el resumen como hoy.

### Non-Functional Requirements

- [ ] Sin cambios de código de producción — el cambio es exclusivamente en
      `vitest.config.ts`.
- [ ] El scoping del threshold queda documentado inline en `vitest.config.ts`, con el mismo
      estilo de comentario que ya explica el exclude de `src/remotion/**`.
- [ ] `make validate` / `.husky/pre-push` no requieren cambios — ya propagan el exit code
      de `pnpm run test:coverage` correctamente.

## Architecture

### Components

- **`vitest.config.ts`**: único archivo modificado. Se agrega la clave
  `coverage.thresholds["src/pipeline/schema.ts"]` con los 4 valores al 100%.

### Data Model

N/A — no hay cambios de datos ni schemas de dominio.

### External Dependencies

Ninguna nueva. Usa la capacidad de `coverage.thresholds` por-glob ya soportada por
`@vitest/coverage-v8@4.1.10` (versión ya instalada).

## User Stories

Ver `issue #3` (cuauhtemocbe/reel-forge-ts) — historia y criterios Gherkin completos ya
publicados ahí, se reusan tal cual como Testing Strategy de este spec.

## Testing Strategy

### Verificación manual (Definition of Done del issue)

No se agregan tests automatizados nuevos (el cambio es de configuración de la herramienta
de test, no de lógica de producción). Se verifica localmente antes de cerrar la tarea:

1. `pnpm test:coverage` con el estado actual del repo → exit 0, resumen impreso igual que
   hoy.
2. Commit descartable que agrega una rama sin testear a `schema.ts` (p.ej. un `if` nuevo
   en un schema sin test que lo cubra) → `pnpm test:coverage` sale con exit no-cero,
   nombrando `schema.ts` y la métrica caída. Se revierte el commit descartable después de
   confirmar.
3. Confirmar que `generate.ts`/`editPlan.ts`/`tts.ts` en su estado actual (cobertura baja
   en sus ramas de I/O) NO disparan falla — el exit sigue siendo 0 por ellos.

## Boundaries & Constraints

### In Scope

- Threshold enforced sobre `src/pipeline/schema.ts`.
- Documentación inline del criterio de scoping en `vitest.config.ts`.

### Out of Scope

- Extraer los helpers puros de `editPlan.ts` (`extractJson`, `resolveEditPlanOverride`) o
  `tts.ts` (`alignmentToWords`) a archivos separados para darles su propio threshold. El
  issue lo deja explícitamente como decisión de implementación no prescrita — se pospone
  para un follow-up si se decide más adelante.
- Cambios a `Makefile` o `.husky/pre-push` — ya propagan el exit code correctamente.
- Mockear ElevenLabs o el CLI de `claude` para subir cobertura de `generate.ts`/
  `editPlan.ts`/`tts.ts` — sigue fuera de scope por convención ya documentada en
  `CLAUDE.md`.

### Technical Constraints

- `@vitest/coverage-v8` (provider `v8`), no `istanbul`.
- No se puede subir `typescript` a `^7` (ver nota en `CLAUDE.md`) — irrelevante para este
  cambio pero se mantiene la restricción general del repo.

## Success Criteria

- [ ] `pnpm test:coverage` sale con status `0` en el estado actual del repo (sin
      regresiones).
- [ ] Un commit descartable que rompe la cobertura de `schema.ts` hace que
      `pnpm test:coverage` salga con status no-cero, nombrando el archivo/métrica.
- [ ] `generate.ts`/`editPlan.ts`/`tts.ts` no bloquean el gate en su estado actual.
- [ ] `pnpm typecheck` y `pnpm lint` verdes.
- [ ] Comentario inline en `vitest.config.ts` explica el criterio de scoping.

## Implementation Plan

Ver `specs/coverage-floor-plan.md`.

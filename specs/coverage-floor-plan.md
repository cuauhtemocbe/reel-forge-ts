# Implementation Plan: Coverage floor enforced en pnpm test:coverage

**Spec**: `specs/coverage-floor.md`
**Created**: 2026-08-08
**Status**: completed

## Components

### 1. `vitest.config.ts` — coverage.thresholds
- **Purpose**: Agregar threshold por-glob sobre `src/pipeline/schema.ts` (100% en las 4
  métricas) + comentario inline documentando por qué solo ese archivo tiene threshold.
- **Files**: `vitest.config.ts`
- **Effort**: XS

## Dependencies

### Build Order
1. Editar `vitest.config.ts` (único componente, sin dependencias).

### External Dependencies
Ninguna — usa `@vitest/coverage-v8@4.1.10` ya instalado.

## Risks & Assumptions

### Risks
- **Riesgo bajo**: el threshold por-glob de Vitest podría no matchear el path si el glob
  no está bien formado (paths relativos vs. absolutos). Mitigación: verificar con una
  corrida real y con un commit descartable que rompe cobertura, tal como pide el DoD del
  issue.

### Assumptions
- `schema.ts` se mantiene efectivamente al 100% hoy (confirmado: no aparece en la tabla
  del reporter `text` porque `skipFull` omite archivos completos — el 100% surge del
  cálculo agregado de "All files": 60/167 stmts entre `editPlan.ts`+`generate.ts`+`tts.ts`
  no suman el total, el resto son `schema.ts`/`constants.ts`).

## Milestones

- [ ] M1: Threshold agregado y documentado en `vitest.config.ts`.
- [ ] M2: `pnpm test:coverage` en verde con el estado actual del repo.
- [ ] M3: Commit descartable confirma que romper `schema.ts` hace fallar el comando
      (evidencia capturada, luego revertido).
- [ ] M4: `pnpm typecheck` + `pnpm lint` verdes.

## Tasks

### Foundation / único task (Effort S completo)

- [ ] **Task 1**: Agregar `coverage.thresholds` a `vitest.config.ts`
  - **Acceptance**:
    - `coverage.thresholds["src/pipeline/schema.ts"]` con
      `{ statements: 100, branches: 100, functions: 100, lines: 100 }`.
    - Comentario inline (estilo consistente con el comentario existente de
      `src/remotion/**`) explicando: por qué solo `schema.ts` tiene threshold, y por qué
      `generate.ts`/`editPlan.ts`/`tts.ts` quedan sin threshold (I/O externo no testeado
      por diseño, ver `CLAUDE.md`).
    - `pnpm test:coverage` sale 0 en el estado actual.
  - **Files**: `vitest.config.ts`
  - **Tests**: Verificación manual (no test automatizado nuevo — ver Testing Strategy del
    spec). Evidencia: correr `pnpm test:coverage` antes/después, y un commit descartable
    que agrega una rama sin cubrir a `schema.ts` para confirmar que el gate falla y se
    revierte.
  - **Effort**: XS

## Effort Estimate

**Total Estimated Time**: <30 min de cambio + verificación manual.

| Phase | Effort |
|-------|--------|
| Foundation (único cambio) | XS |
| Verificación manual (DoD) | XS |

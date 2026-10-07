# Implementation Plan: sonar-project.properties para análisis SonarQube local

**Spec**: `specs/sonar-project-properties.md`
**Created**: 2026-10-06
**Status**: in-progress

## Components

### 1. `sonar-project.properties`
- **Purpose**: Config del scanner con el contenido propuesto en el issue #12, tras
  verificar cada ruta contra el layout real.
- **Files**: `sonar-project.properties`
- **Effort**: XS

### 2. `.gitignore`
- **Purpose**: Ignorar artefactos del scanner dockerizado.
- **Files**: `.gitignore` (`.scannerwork/`, `.sonarlint/`)
- **Effort**: XS

### 3. Wording "local-only"
- **Purpose**: Reemplazar "SonarQube descartado" por "local-only, fuera de CI / `make
  validate` / pre-push".
- **Files**: `README.md` (versionado), `CLAUDE.md` (local, gitignored: no entra al commit)
- **Effort**: XS

## Dependencies

### Build Order
1. Verificar layout + baseline de cobertura (`pnpm test:coverage`).
2. Componentes 1–3 (independientes entre sí).
3. Simular globs contra `git ls-files src`; correr typecheck/lint/coverage.

### External Dependencies
Ninguna nueva. El escaneo real (SonarQube + scanner Docker + token) corre fuera de esta
tarea.

## Risks & Assumptions

### Risks
- **Doble indexado** (`sonar.sources` y `sonar.tests` = `src`): si `sonar.exclusions` y
  `sonar.test.inclusions` dejaran de coincidir, Sonar falla con "can't be indexed twice".
  Mitigación: hoy ambos describen `src/test/*.test.ts`, confirmado con simulación de
  globs; el escaneo real lo confirma definitivamente.
- **Cobertura baja (≈36 % líneas)** choca con el gate por defecto en cambios que toquen
  `generate.ts`/`editPlan.ts`/`tts.ts`. Decisión: opción 1 del issue — se mantiene el
  gate por defecto y se reporta honestamente, porque es una herramienta local consultiva
  y es coherente con #3 (que gateó solo `schema.ts` en vez de esconder el resto).

### Assumptions
- `sonar.language=ts` (del archivo de referencia) sigue siendo aceptado por la versión de
  SonarQube local y no excluye los `.tsx`. No verificado sin escaneo.
- `src/remotion/captionPages.ts` es lógica pura con test propio, pero queda sin cobertura
  en Sonar porque Vitest ya excluye `src/remotion/**` del LCOV. Preexistente, fuera de
  alcance.

## Milestones

- [x] M1: Layout y baseline verificados (LCOV con `SF:src/pipeline/*.ts`, 59/163 líneas).
- [x] M2: Archivo, `.gitignore` y wording escritos.
- [x] M3: Globs simulados sin doble indexado; typecheck/lint/coverage en verde.
- [ ] M4: Escaneo real con `/sonar-check` — pendiente, lo corre el mantenedor.

## Tasks

**Slicing strategy**: Horizontal — un único cambio de configuración sin slices
independientes que valga la pena demostrar por separado.

- [x] **Task 1**: Crear `sonar-project.properties`, actualizar `.gitignore` y el wording
  - **Acceptance**: ver Success Criteria del spec (los ítems sin escaneo).
  - **Files**: `sonar-project.properties`, `.gitignore`, `README.md`, `CLAUDE.md` (local)
  - **Tests**: verificación manual (simulación de globs + gates del repo).
  - **Effort**: XS

## Effort Estimate

**Total Estimated Time**: <30 min.

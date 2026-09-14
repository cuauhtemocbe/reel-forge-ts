# Implementation Plan: Restaurar config de Dependabot perdida tras el merge de PR #4

**Spec**: `specs/restore-dependabot-config.md`
**Created**: 2026-09-14
**Status**: approved

## Components

### 1. `.github/dependabot.yml`
- **Purpose**: Recrear el archivo con el contenido exacto mergeado en PR #4.
- **Files**: `.github/dependabot.yml`
- **Effort**: XS

## Dependencies

### Build Order
1. Crear el archivo (único componente, sin dependencias).

### External Dependencies
Ninguna.

## Risks & Assumptions

### Risks
- **Riesgo bajo**: que el contenido citado en el issue #46 no sea byte-idéntico al de
  PR #4. Mitigación: el contenido fue provisto explícitamente por el usuario como "el
  contenido original de PR #4" en la tarea — se usa tal cual, sin reinterpretar.

### Assumptions
- Las vulnerability alerts del repo (separadas de `dependabot.yml`) siguen habilitadas y
  no requieren acción — confirmado en el contexto de la tarea.

## Milestones

- [ ] M1: Rama nueva creada desde `main`.
- [ ] M2: `.github/dependabot.yml` agregado con el contenido exacto.
- [ ] M3: Commit + push de la rama.
- [ ] M4: PR abierto contra `main` referenciando el issue #46.

## Tasks

**Slicing strategy**: Vertical — un único slice, no hay foundation compartida que
justifique separar capas para un archivo de config aislado.

### Slice 1: restaurar dependabot.yml
- [ ] **Task 1**: Agregar `.github/dependabot.yml`
  - **Acceptance**: archivo presente con exactamente el contenido especificado
    (ecosystem `npm`, directory `/`, schedule `weekly`, grouping `minor-and-patch`).
  - **Files**: `.github/dependabot.yml`
  - **Tests**: verificación manual (diff contra el contenido citado en el issue).
  - **Effort**: XS
- [ ] **Task 2**: Commit, push y abrir PR
  - **Acceptance**: PR abierto contra `main`, título referenciando issue #46, body con
    `closes cuauhtemocbe/meta-projects#46`, sin merge por el agente.
  - **Files**: N/A (operación de git/GitHub).
  - **Tests**: N/A.
  - **Effort**: XS

## Effort Estimate

**Total Estimated Time**: <10 min.

| Phase | Effort |
|-------|--------|
| Restauración del archivo | XS |
| PR | XS |

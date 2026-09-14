---
title: Restaurar config de Dependabot perdida tras el merge de PR #4
status: draft
created: 2026-09-14
updated: 2026-09-14
issue: "cuauhtemocbe/meta-projects#46"
---

# Restaurar config de Dependabot perdida tras el merge de PR #4

## Objective

Restaurar `.github/dependabot.yml` en `main` con el contenido original mergeado en
PR #4, que desapareció silenciosamente de `main` tras un force-push posterior al merge.

## Context

`.github/dependabot.yml` fue agregado y mergeado vía PR #4
(cuauhtemocbe/reel-forge-ts). Después de ese merge, `main` fue force-pusheado y el archivo
quedó fuera del historial resultante — no hay commit de reversión ni PR que lo haya
tocado, simplemente dejó de estar presente. Los alertas de vulnerabilidades de GitHub
(Dependabot alerts) siguen habilitadas a nivel de repo; lo único que regresionó es la
config de version-updates (`dependabot.yml`), que es lo que dispara los PRs automáticos de
actualización de dependencias.

El contenido a restaurar es exactamente el de PR #4 — no hay decisión de diseño nueva
acá, es una restauración 1:1 de config ya revisada y aprobada previamente.

## Requirements

### Functional Requirements

- [ ] `.github/dependabot.yml` existe en `main` con el contenido exacto de PR #4:
      ecosystem `npm`, directory `/`, schedule `weekly`, grouping `minor-and-patch` para
      `update-types: ["minor", "patch"]`.

### Non-Functional Requirements

- [ ] Sin cambios de código de producción ni de otros archivos de configuración — el
      cambio es exclusivamente `.github/dependabot.yml`.
- [ ] No se toca la config de vulnerability alerts (ya está habilitada a nivel de repo,
      fuera del alcance de este archivo).

## Architecture

### Components

- **`.github/dependabot.yml`**: único archivo, config declarativa de Dependabot
  (version-updates). No interactúa con código de la app.

### Data Model

N/A.

### External Dependencies

Ninguna nueva — usa el mismo mecanismo de GitHub Dependabot ya vigente en el repo.

## User Stories

GitHub Issue cuauhtemocbe/meta-projects#46 ya documenta el problema y el pedido de
restauración; se reusa tal cual como criterio de aceptación de este spec.

## Testing Strategy

No aplica testing automatizado — es config declarativa consumida por GitHub, no por el
pipeline de la app. Verificación manual: el YAML es válido y su contenido es
byte-idéntico al de PR #4 (diff contra el contenido citado en el issue #46).

## Boundaries & Constraints

### In Scope

- Recrear `.github/dependabot.yml` con el contenido de PR #4.
- Abrir un PR contra `main` referenciando el issue #46.

### Out of Scope

- Investigar o prevenir futuros force-push a `main` (fuera del alcance de este repo de
  un solo usuario; no se agrega branch protection ni CI en este cambio).
- Cualquier cambio a la config de vulnerability alerts — ya está habilitada.
- Cambios al ecosystem, schedule o grouping más allá de restaurar el original.

### Technical Constraints

Ninguna específica — archivo YAML plano, sin dependencias del toolchain del proyecto.

## Success Criteria

- [ ] `.github/dependabot.yml` presente en la rama con el contenido exacto especificado.
- [ ] PR abierto contra `main`, título referenciando el issue #46, cuerpo con
      `closes cuauhtemocbe/meta-projects#46`.
- [ ] PR no mergeado por el agente — queda abierto para revisión del usuario.

## Implementation Plan

Ver `specs/restore-dependabot-config-plan.md`.

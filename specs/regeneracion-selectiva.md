---
title: Regeneración selectiva del pipeline (--mode audio/video)
status: completed
created: 2026-08-04
updated: 2026-08-04
issue: "#1, #2"
---

# Regeneración selectiva del pipeline (--mode audio/video)

## Objective

Agregar un flag `--mode <all|audio|video>` a `pnpm generate` para que el operador del
pipeline pueda regenerar solo el audio (probar un `ELEVENLABS_VOICE_ID` distinto) o solo
el video (iterar sobre `editPlan.json` reusando el audio ya generado), sin pagar una
llamada a ElevenLabs ni esperar el render completo de Remotion cuando no hace falta.

## Context

`src/pipeline/generate.ts::generateReel` siempre corre las tres etapas del pipeline en
secuencia — TTS (ElevenLabs) → plan de edición → bundle + render (Remotion) — sin importar
qué cambió desde la corrida anterior. Cada corrida completa tiene costo real (llamada a
ElevenLabs) y toma varios minutos (render con Chrome headless).

Esto se volvió un problema concreto trabajando en el primer reel real
(`input/el-muro-alturas/`): para corregir un bug visual en los captions (`Captions.tsx`) o
ajustar la selección de fotos/transiciones en `editPlan.json`, cada iteración obligaba a
regenerar el audio de nuevo aunque el guion no había cambiado — ver
`.claude/skills/user-stories` conversación previa, issues #1 y #2.

## Requirements

### Functional Requirements

- [ ] `pnpm generate --input <carpeta> --mode audio` corre solo TTS, persiste el resultado
      y termina sin tocar `images/`, `editPlan.json`, el bundle ni el render.
- [ ] `pnpm generate --input <carpeta> --mode video` reusa el audio persistido de una
      corrida `all`/`audio` anterior (sin llamar a ElevenLabs) y corre plan de edición +
      render normalmente.
- [ ] `pnpm generate --input <carpeta>` (sin `--mode`, o `--mode all`) mantiene el
      comportamiento actual: las tres etapas, sin cambios de resultado.
- [ ] Un `--mode` desconocido falla con un mensaje que lista los valores válidos.
- [ ] `--mode video` sin una corrida previa (`tts.json`/`audio.mp3` inexistentes) falla con
      un mensaje que indica correr `--mode all` o `--mode audio` primero.

### Non-Functional Requirements

- [ ] Costo: `--mode audio` y `--mode video` nunca disparan ambas cosas (TTS + render) en
      la misma corrida — son mutuamente excluyentes con `all`.
- [ ] Testing: toda la lógica de decisión (validación de `--mode`, forma de `tts.json`,
      qué se borra/preserva de `public/reels/<reel>/` según el modo) tiene test
      automatizado sin mockear ElevenLabs ni Remotion — sigue la convención ya
      documentada en `CLAUDE.md` de no testear automáticamente las integraciones externas
      con costo por llamada.

## Architecture

### Components

- **`GenerateModeSchema`** (`src/pipeline/schema.ts`): `z.enum(["all", "audio", "video"])`,
  mismo patrón que `TransitionTypeSchema`/`KenBurnsPresetSchema`.
- **`src/cli.ts`**: suma `--mode` a `parseArgs` (default `"all"` si no se pasa), valida
  contra `GenerateModeSchema` antes de invocar `generateReel`.
- **Caché de TTS** (`public/reels/<reel>/tts.json`): el `TtsResultSchema` existente
  (`audioPath`, `durationInSeconds`, `words`) ya tiene la forma que necesita el caché — se
  serializa tal cual, sin un schema nuevo.
- **`loadCachedTts(publicReelDir)`** (`src/pipeline/tts.ts` o `generate.ts`): lee y valida
  `tts.json`, confirma que `audio.mp3` sigue en disco, tira error descriptivo si falta
  cualquiera de los dos.
- **`generateReel`** (`src/pipeline/generate.ts`): se bifurca por modo:
  - `audio`: TTS → guarda `tts.json` → return, sin validar `images/` ni `editPlan.json`.
  - `video`: `loadCachedTts()` en vez de `generateSpeech()` → sigue igual desde el plan de
    edición.
  - `all` (default): comportamiento actual + guarda `tts.json` al final del TTS.
- **Borrado acotado del directorio de trabajo**: hoy `rm(publicReelDir, {recursive:true})`
  borra todo (`images/`, `audio.mp3`, `tts.json`) al arrancar cualquier corrida. Pasa a
  borrar siempre `images/`, pero solo borrar `audio.mp3`/`tts.json` cuando el modo vaya a
  regenerarlos (`all`/`audio`) — nunca en `video`.

### Data Model

Sin cambios de schema más allá de `GenerateModeSchema`. `tts.json` reusa
`TtsResultSchema` tal cual.

### External Dependencies

Ninguna nueva — sigue usando `@elevenlabs/elevenlabs-js`, `@remotion/bundler` y
`@remotion/renderer` ya presentes en `package.json`.

## User Stories

Ver issues [#1](https://github.com/cuauhtemocbe/reel-forge-ts/issues/1) (modo `audio`) y
[#2](https://github.com/cuauhtemocbe/reel-forge-ts/issues/2) (modo `video`, depende de #1)
para las historias completas con criterios de aceptación en Gherkin — no se duplican acá,
son la fuente de verdad de los criterios.

## Testing Strategy

### Unit Tests

- Validación de `GenerateModeSchema` (valores válidos/inválidos) — `src/test/schema.test.ts`.
- `loadCachedTts()`: archivo `tts.json` válido, ausente, corrupto (JSON inválido o no pasa
  el schema), y caso `audio.mp3` faltante con `tts.json` presente — `src/test/tts.test.ts`
  o un archivo nuevo, con carpetas temporales (`node:fs/promises` + `os.tmpdir()`), sin red.
- Función que decide qué borrar de `public/reels/<reel>/` según el modo — mismo patrón de
  test con carpeta temporal.

### Integration Tests

No aplica en el sentido tradicional (sin servidor/API propia). El único "integration"
real sería correr `generateReel` de punta a punta, lo cual pega contra ElevenLabs y
Remotion — explícitamente fuera del alcance de test automatizado por la convención del
proyecto (ver Non-Functional Requirements arriba).

### E2E Tests

Manual: correr `pnpm generate --mode audio`, después `pnpm generate --mode video`, y
confirmar que el segundo no re-invoca ElevenLabs (por tiempo/log) y que el `.mp4`
resultante refleja el `editPlan.json` vigente. Se documenta como paso manual en el DoD de
cada issue, igual que ya se valida manualmente `generateEditPlan`/el render hoy.

### Performance Tests

No aplica — no hay requisito de latencia más allá de "no llamar a ElevenLabs quiere decir
no llamar a ElevenLabs", que se verifica por ausencia de esa llamada en el código
ejecutado (branch nunca alcanzado), no por medición de tiempo.

## Boundaries & Constraints

### In Scope

- Flag `--mode` con tres valores explícitos, elegido a mano por el operador en cada corrida.
- Persistencia de `tts.json` + preservación selectiva de `audio.mp3` según modo.

### Out of Scope

- Caché automático por hash de `script.txt` + `ELEVENLABS_VOICE_ID` (detectar solo si
  cambió, sin pasar `--mode` a mano). Es una historia de seguimiento identificada durante
  el dry-run de `/user-stories` — más robusta pero no lo que se pidió ahora. No se crea
  como issue todavía.
- Cachear o saltear el paso de plan de edición (`editPlan.json`/Claude CLI) — ya es
  relativamente barato/rápido comparado con TTS y render, y no fue parte del pedido.
- Multi-reel / regenerar en batch — cada corrida sigue siendo un `--input <carpeta>` a la vez.

### Technical Constraints

- TypeScript pineado a `6.0.3` (ver CLAUDE.md) — sin impacto en esta feature, no toca
  configuración del compilador.
- Sin mocks de ElevenLabs/Claude CLI en tests (convención existente del proyecto).
- Node >=22 (ya requerido por `engines` en `package.json`) — necesario por `--env-file`
  que ya usa el script `generate`.

## Success Criteria

- [ ] `pnpm generate --mode audio` termina sin generar `output/<reel>.mp4` y deja
      `public/reels/<reel>/tts.json` + `audio.mp3` en disco.
- [ ] `pnpm generate --mode video` sobre un reel con `tts.json` cacheado produce
      `output/<reel>.mp4` sin invocar ElevenLabs.
- [ ] `pnpm generate` sin `--mode` (o con `--mode all`) produce el mismo resultado que
      antes de esta feature — regresión cero en el flujo por defecto.
- [ ] Todos los escenarios Gherkin de los issues #1 y #2 tienen test automatizado
      correspondiente (excepto los pasos que requieren ElevenLabs/Remotion reales,
      documentados como verificación manual).
- [ ] `pnpm typecheck`, `pnpm lint` y `pnpm test:run` verdes.

## Implementation Plan

Implementado directamente tras la aprobación (alcance chico y ya validado en el dry-run
de la Fase 1, sin plan/tasks separados en archivo aparte):

- `GenerateModeSchema` en `schema.ts` + tests en `schema.test.ts`.
- `saveTtsCache`/`loadCachedTts` en `tts.ts` (TDD: tests en `tts.test.ts` primero, en rojo,
  después implementación) — reusan `TtsResultSchema` tal cual como forma de `tts.json`.
- `generateReel` en `generate.ts`: acepta `mode`, TTS o `loadCachedTts` según corresponda,
  return temprano en modo `audio` antes de tocar `images/`/`editPlan.json`, wipe acotado a
  `images/` (nunca borra `audio.mp3`/`tts.json`).
- `cli.ts`: flag `--mode` (default `all`), validado con `GenerateModeSchema`.
- `README.md`: documenta `--mode` y corrige un bug real encontrado de paso — el ejemplo
  usaba `pnpm generate -- --input ...`, pero pnpm (a diferencia de npm) reenvía ese `--`
  literal al script en vez de descartarlo, y `cli.ts` lo rechazaba como argumento inesperado.

Verificado: `pnpm typecheck`, `pnpm lint`, `pnpm test:run` (29/29) en verde, más dos smoke
tests manuales sin costo de API (`--mode invalido` y `--mode video` sin caché previo, ambos
fallan con el mensaje esperado antes de llamar a ElevenLabs).

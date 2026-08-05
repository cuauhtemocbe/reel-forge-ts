# CLAUDE.md

Guía de instrucciones para Claude Code al trabajar en este repositorio.

**Proyecto**: `reel-forge-ts` — generador local de reels/videos verticales a partir de
imágenes + un guion de texto. TTS (ElevenLabs) → plan de edición decidido por Claude Code
CLI en modo headless → composition de Remotion (Ken Burns, transiciones, captions
animados) → mp4. Sin música. Ver README.md para el pipeline completo y el uso.

**Herramienta 100% local**: este repo nunca se despliega (no Railway, no hosting de
ningún tipo, no Docker) — es de un solo usuario, corre en su máquina. No agregar Docker,
CI/CD ni nada orientado a producción/deploy salvo pedido explícito. A diferencia del
boilerplate base `dockyard2sail-ts`, este repo no tiene `.github/workflows/`, `.mcp.json`
(SonarQube) ni configuración de Trivy — decisión deliberada, no un paso pendiente.

**`typescript` pineado a `6.0.3`, no `^7`**: el bundler de Remotion (`@remotion/bundler`,
vía su esbuild-loader) llama `typescript.readConfigFile`/`typescript.sys` del paquete
`typescript` instalado para leer `tsconfig.json` — API que `typescript@7.x` (el compilador
nativo, portado a Go) no expone igual, y `pnpm studio`/render rompen en el arranque con
`TypeError: Cannot read properties of undefined (reading 'readFile')`. `6.0.3` sigue
siendo el compilador clásico en JS y es compatible. No subir a `7.x` mientras Remotion no
lo soporte explícitamente.

---

## Available Skills

Este entorno local tiene instalados los siguientes skills de Claude Code (`.claude/skills/`,
carpeta local no versionada — ver `.gitignore`):

- **`/spec-driven-dev`**: Flujo completo de desarrollo guiado por especificación (idea → spec → plan → tareas → implementación)
- **`/user-stories`**: Escribir y publicar historias de usuario con criterios de aceptación Gherkin en GitHub Issues
- **`/commit-writer`**: Genera conventional commits siguiendo los estándares del proyecto
- **`/testing`**: Flujo TDD con mutation testing, objetivos de cobertura y validación de calidad de tests
- **`/sonar-check`**: Análisis de calidad de código con SonarQube — requiere configurar `.mcp.json`/`sonar-project.properties` antes de usarse; no está configurado todavía en este repo
- **`/trivy-scan`**: Escaneo de seguridad de vulnerabilidades, secretos, IaC y licencias

Usar estos skills proactivamente cuando sean relevantes para el trabajo en curso.

---

## Package Manager: pnpm (obligatorio)

Este proyecto usa **pnpm exclusivamente** — no usar `npm` ni `yarn`.

```bash
pnpm install
pnpm studio             # Remotion Studio — preview en vivo del composition
pnpm generate -- --input <carpeta>   # corre el pipeline completo (TTS + plan + render)
pnpm typecheck          # tsc --noEmit sobre tsconfig.json (src) y tsconfig.test.json (tests)
pnpm test               # vitest en modo watch
pnpm test:run           # vitest una sola corrida
pnpm test:coverage      # vitest con cobertura (v8)
pnpm lint               # biome check
pnpm format             # biome format --write
pnpm format:check       # biome format (sin escribir)
pnpm validate           # alias de `make validate`
```

---

## Makefile

`make help` lista los targets. `make validate` = lock-check + typecheck + test:coverage +
lint + `pnpm audit` — es lo que corre `pre-push`/`pre-merge-commit` hacia `main` (ver
"Git Hooks"). Deliberadamente no incluye `build` ni `check-docs`/CHANGELOG (a diferencia
del boilerplate base `dockyard2sail-ts`): este proyecto no tiene paso de build (Remotion
tiene su propio bundler para `studio`/render) ni versión que sincronizar.

---

## Git Hooks (Husky)

- **`pre-commit`**: gitleaks (secret scanning sobre el staged diff) + `lint-staged`
  (biome). Rápido a propósito — nada de validación completa acá.
- **`pre-push`**: a `main` corre `make validate` completo; a otras ramas solo
  `pnpm typecheck`.

No usar `--no-verify` salvo pedido explícito del usuario.

---

## Recommended Development Workflow

### Para nuevas features

1. **Spec-Driven Development**: usar `/spec-driven-dev` para transformar ideas en especificaciones estructuradas
   - Fase 1 (Specify): idea → spec en `specs/{feature}.md`
   - Fase 2 (Plan): plan de implementación → `specs/{feature}-plan.md`
   - Fase 3 (Tasks): desglose en tareas → GitHub Issues con `/user-stories`
   - Fase 4 (Implement): ejecutar tareas con TDD usando `/testing`

2. **Implementación**: seguir el ciclo TDD por cada tarea
   - Escribir tests primero
   - Correr tests y verificar que fallan
   - Implementar la funcionalidad
   - Correr tests y verificar que pasan

3. **Quality Gates**: antes de commitear
   - Correr `pnpm typecheck` y `pnpm test:run`
   - Correr `pnpm lint`
   - Asegurar que todos los quality gates pasen

4. **Commit**: usar `/commit-writer` para generar conventional commits

5. **Memoria**: guardar aprendizajes en Engram (ver "Memory (Engram)" abajo)

### Para bug fixes

1. Escribir un test que reproduzca el bug (debe fallar)
2. Corregir el bug
3. Verificar que el test pasa
4. Correr quality gates (`pnpm typecheck`, `pnpm lint`)
5. Commitear con `/commit-writer`
6. Guardar el bugfix en memoria con `mem_save`

---

## Memory (Engram)

Acceso a memoria persistente vía MCP tools (`mem_save`, `mem_search`,
`mem_session_summary`, etc.).

- Guardar proactivamente después de trabajo significativo — no esperar a que se pida.
- Después de cualquier compactación o reset de contexto, llamar `mem_context` para
  recuperar el estado de sesiones previas antes de continuar.

### Cuándo guardar
- Bugfix terminado → `mem_save` (type: bugfix)
- Decisión de arquitectura o tecnología → `mem_save` (type: decision, topic_key: "architecture/xxx")
- Gotcha o patrón no obvio descubierto → `mem_save` (type: discovery)
- Configuración no trivial → `mem_save` (type: config)
- Preferencia del proyecto o del usuario identificada → `mem_save` (type: preference)

### Al iniciar sesión
1. Llamar `mem_context` para revisar historial reciente
2. Si falta contexto relevante, llamar `mem_search` con keywords del tema actual

### Al cerrar sesión
Llamar `mem_session_summary` con estructura: Goal / Accomplished / Discoveries / Files.

### En caso de compactación
Si aparece un mensaje de reset o compactación de contexto:
1. Llamar INMEDIATAMENTE `mem_session_summary` con el contenido del resumen compactado
2. Luego llamar `mem_context` para recuperar contexto adicional

No saltear el paso 1 — sin él se pierde todo lo hecho antes de la compactación.

---

## Arquitectura del pipeline

```
src/pipeline/
├── schema.ts     # zod: única fuente de verdad de las formas de datos del pipeline
├── constants.ts  # fps/resolución — compartido entre generate.ts y src/remotion/Root.tsx
├── tts.ts        # ElevenLabs convertWithTimestamps -> audio.mp3 + WordTimestamp[]
├── editPlan.ts   # invoca `claude -p --output-format json` -> EditPlan validado con zod
└── generate.ts   # orquesta: copia assets a public/ -> tts -> editPlan -> bundle -> render

src/remotion/
├── Root.tsx              # <Composition> "Reel", duración dinámica vía calculateMetadata
├── ReelComposition.tsx    # TransitionSeries (Ken Burns + transiciones) + Audio + Captions
└── components/
    ├── KenBurnsImage.tsx  # presets de zoom/pan (enum cerrado, no valores libres de Claude)
    └── Captions.tsx        # @remotion/captions createTikTokStyleCaptions, karaoke highlight
```

**Por qué un enum cerrado de presets de Ken Burns/transiciones en vez de valores
numéricos libres**: `editPlan.ts` le pide a Claude que elija entre un set fijo de
`KenBurnsPreset`/`TransitionType` (ver `schema.ts`), no que devuelva coordenadas o
duraciones de movimiento a mano. Esto garantiza que cualquier respuesta válida contra el
schema sea también visualmente razonable — un LLM eligiendo "zoom-in" es confiable; un
LLM inventando `translateX: -340%` no lo es.

**Por qué las imágenes/audio se copian a `public/`**: Remotion solo puede servir vía
`staticFile()` archivos que viven dentro de `public/` (no acepta paths absolutos
arbitrarios del filesystem por razones de seguridad del bundler). `generate.ts` copia
cada reel a `public/reels/<nombre>/` antes de bundlear — carpeta regenerada en cada
corrida, gitignored.

**Por qué no hay `schema` en el `<Composition>` de Root.tsx**: el prop `schema` de
Remotion habilita validación + una UI de edición de props en Studio, pero exige que
`defaultProps` la satisfaga al cargar. Como no hay props por defecto razonables sin un
reel real generado (0 escenas viola `ReelPropsSchema.min(1)`), la validación de props
vive enteramente en el pipeline (`ReelPropsSchema.parse()` en `generate.ts`), no en
Remotion Studio.

**Claude CLI headless**: `editPlan.ts` invoca `claude -p <prompt> --output-format json
--allowedTools ""` vía `child_process.execFile` (no el Agent SDK — se usa la CLI
literal). Si la primera respuesta no valida contra `EditPlanSchema`, se hace un único
reintento pasándole a Claude el error de vuelta. Cada corrida de `pnpm generate` tiene
costo (llamada real a la API de Claude) — no hay mocks de esto en los tests unitarios por
diseño (ver `src/test/`, cubren solo lógica pura: `schema.ts`, `alignmentToWords` de
`tts.ts`, `extractJson` de `editPlan.ts`).

---

## Testing Guidelines

Usar el skill `/testing` para guía completa de TDD.

- **Framework**: Vitest (`vitest.config.ts`, entorno `node` — no hay componentes React
  de Remotion bajo test unitario, se validan visualmente con `pnpm studio`).
- **Qué se testea**: lógica pura del pipeline (zod schemas, parsing, alineación de
  timestamps). Las llamadas reales a ElevenLabs y a `claude` CLI no se mockean ni se
  testean automáticamente — son integraciones externas con costo por llamada.
- **TDD Cycle**: Red (test que falla) → Green (mínimo código para pasar) → Refactor →
  Verify (`pnpm typecheck` + `pnpm lint`) → Commit (`/commit-writer`) → Remember
  (`mem_save`).

### Antes de mergear

- [ ] Todos los tests pasando (`pnpm test:run`)
- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm lint` sin errores
- [ ] Mensajes de commit siguen convenciones (`/commit-writer`)
- [ ] User stories actualizadas/cerradas con evidencia (`/user-stories`), si aplica

---

## User Stories and Issue Management

Usar el skill `/user-stories` para escribir y gestionar historias de usuario cuando el
trabajo lo amerite (este es un proyecto personal de un solo usuario — no todo cambio
necesita pasar por un issue formal):

- Historias en lenguaje de dominio (no implementación técnica)
- Validación con criterios **INVEST**
- Criterios de aceptación en formato **Gherkin** (Given/When/Then)
- Publicación a GitHub Issues (`cuauhtemocbe/reel-forge-ts`) con formato y labels adecuados

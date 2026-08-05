# 🎬 reel-forge-ts

Generador **100% local** de reels/videos verticales a partir de imágenes + un guion de
texto. Sin música — solo voz narrada, captions animados estilo karaoke y edición
(pacing, transiciones, Ken Burns) decidida dinámicamente por **Claude Code CLI**.

No pensado para deploy — es una herramienta personal que corrés en tu máquina.

---

## Pipeline

```
script.txt + images/*.jpg
        │
        ▼
  1. TTS (ElevenLabs) ──────────► audio.mp3 + timestamps por palabra
        │
        ▼
  2. Plan de edición (Claude Code CLI, headless) ──► duración/transición/Ken Burns por escena
        │
        ▼
  3. Composition de Remotion (React) ──► Ken Burns + transiciones + captions karaoke
        │
        ▼
  4. Render (@remotion/renderer) ──────────────────► output/<reel>.mp4
```

## Requisitos

- **Node** >= 22, **pnpm** >= 9 (`corepack enable`)
- **[Claude Code CLI](https://claude.com/claude-code)** instalada y autenticada en esta
  máquina (`claude` en el PATH) — se invoca en modo headless (`claude -p --output-format
  json`) para decidir el plan de edición. Cada corrida de `pnpm generate` hace al menos
  una llamada a la API de Claude (tiene costo).
- **API key de ElevenLabs** — para generar la voz con timestamps por palabra.

## Setup

```bash
pnpm install
cp .env.example .env
# completar ELEVENLABS_API_KEY (y opcionalmente ELEVENLABS_VOICE_ID) en .env
```

## Uso

1. Creá una carpeta de input con tu guion y tus imágenes (ver `input/example/` como
   plantilla):

   ```
   input/mi-reel/
   ├── script.txt        # el guion a narrar
   └── images/
       ├── 01.jpg
       ├── 02.jpg
       └── ...            # en el orden en que deben aparecer
   ```

2. Generá el reel:

   ```bash
   pnpm generate -- --input ./input/mi-reel
   ```

   Esto corre el pipeline completo y deja el resultado en `output/mi-reel.mp4` (y
   `output/mi-reel.props.json` con el plan de edición completo, útil para debug).

3. (Opcional) Previsualizá/ajustá la composition en vivo con Remotion Studio:

   ```bash
   pnpm studio
   ```

   Nota: Studio arranca sin escenas por defecto — para ver un reel real ahí, abrí
   `output/<reel>.props.json` (generado en el paso 2) y pegá su contenido como input
   props de la composition "Reel" desde la UI de Studio.

## Estructura del proyecto

```
src/
├── cli.ts                    # entry point de `pnpm generate`
├── pipeline/
│   ├── schema.ts              # zod: EditPlan, TtsResult, ReelProps
│   ├── constants.ts           # fps/resolución compartidos con el composition
│   ├── tts.ts                 # ElevenLabs: texto -> audio.mp3 + timestamps por palabra
│   ├── editPlan.ts            # invoca `claude -p` headless -> plan de edición validado
│   └── generate.ts            # orquesta todo el pipeline end-to-end
├── remotion/
│   ├── index.ts               # entry point de Remotion (registerRoot)
│   ├── Root.tsx                # <Composition> "Reel" + duración dinámica
│   ├── ReelComposition.tsx     # TransitionSeries + Audio + Captions
│   └── components/
│       ├── KenBurnsImage.tsx   # zoom/pan por preset
│       └── Captions.tsx        # captions animados estilo karaoke (@remotion/captions)
└── test/                       # tests unitarios (Vitest) de la lógica del pipeline
```

## Scripts

```bash
pnpm studio            # Remotion Studio (preview en vivo del composition)
pnpm generate -- --input <carpeta>   # corre el pipeline completo
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest en modo watch
pnpm test:run           # vitest una sola corrida
pnpm test:coverage      # vitest con cobertura
pnpm lint               # biome check
pnpm format             # biome format --write
pnpm validate            # alias de `make validate` (typecheck + test:coverage + lint + audit)
```

## Decisiones de diseño

- **Sin música**: el audio final es únicamente la voz generada por TTS — a propósito,
  fuera de alcance de este proyecto.
- **Sin CI/Docker/deploy**: es una herramienta de un solo usuario que corre local — se
  mantuvo el `Makefile`/Husky del boilerplate base (`dockyard2sail-ts`) para validación
  y hooks de git, pero se descartó Vite, Docker/DevContainers, GitHub Actions y
  SonarQube por no aportar valor acá.
- **Assets vía `public/`**: Remotion solo puede servir archivos dentro de `public/` (ver
  [staticFile()](https://www.remotion.dev/docs/staticfile)) — `generate.ts` copia las
  imágenes y el audio de cada reel a `public/reels/<nombre>/` antes de renderizar
  (carpeta regenerada en cada corrida, gitignored).
- **Plan de edición vía Claude CLI**: `editPlan.ts` le pasa a Claude el guion completo,
  la lista de imágenes y la duración real del audio, y le pide que devuelva JSON
  validado contra un schema cerrado de zod (duración/transición/Ken Burns por escena) —
  con un reintento de reparación si la primera respuesta no valida.

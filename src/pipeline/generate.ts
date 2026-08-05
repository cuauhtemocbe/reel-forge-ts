import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  REMOTION_COMPOSITION_ID,
  REMOTION_ENTRY_POINT,
} from "./constants.ts";
import { generateEditPlan, resolveEditPlanOverride } from "./editPlan.ts";
import {
  type EditPlan,
  EditPlanOverrideSchema,
  type GenerateMode,
  type ReelProps,
  ReelPropsSchema,
  type TtsResult,
} from "./schema.ts";
import { generateSpeech, loadCachedTts, saveTtsCache } from "./tts.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const projectRoot = path.resolve(import.meta.dirname, "..", "..");

const naturalSort = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;

/**
 * Equivalente Node-safe de `staticFile()`: esa función de Remotion solo agrega el prefijo
 * `/public` cuando corre en el navegador (lee `window.remotion_staticBase`, seteado por el
 * index.html del bundle). Acá construimos los inputProps en Node antes de renderizar, así
 * que `staticFile()` cae a su fallback sin `/public` y el renderer pide una URL que no
 * existe (404). Replicamos a mano la URL real que sirve @remotion/renderer.
 */
function publicAssetPath(relativePath: string): string {
  return `/public/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

async function listImageFiles(imagesDir: string): Promise<string[]> {
  const entries = await readdir(imagesDir, { withFileTypes: true });
  return entries
    .filter(
      (entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort(naturalSort);
}

/**
 * Genera un reel a partir de una carpeta de input con `script.txt` (+ `images/` salvo en
 * modo `audio`): TTS (ElevenLabs) → plan de edición (Claude Code CLI) → composition de
 * Remotion → mp4.
 *
 * `mode` controla qué etapas corren:
 * - `all` (default): TTS + plan de edición + render, como siempre.
 * - `audio`: solo TTS — guarda `audio.mp3`/`tts.json` y retorna sin renderizar. No exige
 *   `images/` ni `editPlan.json`.
 * - `video`: reusa el `tts.json` de una corrida `all`/`audio` anterior (sin llamar a
 *   ElevenLabs) y corre plan de edición + render.
 *
 * Devuelve la ruta absoluta del artefacto generado: el mp3 en modo `audio`, el mp4 en
 * los demás casos.
 */
export async function generateReel(inputDir: string, mode: GenerateMode = "all"): Promise<string> {
  const absoluteInputDir = path.resolve(inputDir);
  const reelName = path.basename(absoluteInputDir);
  const scriptPath = path.join(absoluteInputDir, "script.txt");
  const imagesDir = path.join(absoluteInputDir, "images");
  const editPlanOverridePath = path.join(absoluteInputDir, "editPlan.json");

  if (!existsSync(scriptPath)) {
    throw new Error(`No se encontró ${scriptPath}. Cada input necesita un script.txt.`);
  }

  const scriptText = (await readFile(scriptPath, "utf-8")).trim();
  if (!scriptText) {
    throw new Error(`${scriptPath} está vacío.`);
  }

  // Alcanza con public/reels/<reel>/ para el audio — no se toca images/ acá, así que una
  // corrida en modo audio/video nunca pisa las imágenes ya copiadas por una corrida previa.
  const publicReelDir = path.join(projectRoot, "public", "reels", reelName);
  await mkdir(publicReelDir, { recursive: true });

  let tts: TtsResult;
  if (mode === "video") {
    console.log("🗣️  Reusando audio cacheado (--mode video, sin llamar a ElevenLabs)...");
    tts = await loadCachedTts(publicReelDir);
  } else {
    console.log("🗣️  Generando voz (ElevenLabs)...");
    tts = await generateSpeech(scriptText, publicReelDir);
    await saveTtsCache(publicReelDir, tts);
  }
  console.log(`✅ Audio: ${tts.durationInSeconds.toFixed(2)}s, ${tts.words.length} palabras`);

  if (mode === "audio") {
    console.log(`✅ Audio listo: ${tts.audioPath}`);
    return tts.audioPath;
  }

  if (!existsSync(imagesDir)) {
    throw new Error(`No se encontró ${imagesDir}. Cada input necesita una carpeta images/.`);
  }

  const imageFiles = await listImageFiles(imagesDir);
  if (imageFiles.length === 0) {
    throw new Error(`${imagesDir} no tiene imágenes (.jpg/.jpeg/.png/.webp).`);
  }

  // Remotion solo puede servir assets que viven dentro de public/ (ver staticFile()) —
  // copiamos la copia de trabajo ahí. Acotado a images/ para no tocar audio.mp3/tts.json.
  const publicImagesDir = path.join(publicReelDir, "images");
  await rm(publicImagesDir, { recursive: true, force: true });
  await mkdir(publicImagesDir, { recursive: true });
  await Promise.all(
    imageFiles.map((file) => cp(path.join(imagesDir, file), path.join(publicImagesDir, file))),
  );

  let editPlan: EditPlan;
  if (existsSync(editPlanOverridePath)) {
    console.log("🎬 Usando editPlan.json (transición/Ken Burns fijados a mano)...");
    const overrideRaw = JSON.parse(await readFile(editPlanOverridePath, "utf-8"));
    const override = EditPlanOverrideSchema.parse(overrideRaw);

    // El override puede seleccionar un subconjunto curado de images/ (no necesita usarlas
    // todas) — solo es un error si referencia un archivo que ni siquiera existe ahí.
    const overrideFiles = override.scenes.map((scene) => scene.imageFile);
    const extra = overrideFiles.filter((file) => !imageFiles.includes(file));
    if (extra.length > 0) {
      throw new Error(
        `${editPlanOverridePath} referencia imágenes que no están en ${imagesDir}: [${extra.join(", ")}].`,
      );
    }

    editPlan = resolveEditPlanOverride(override, tts.durationInSeconds);
  } else {
    console.log("🎬 Generando plan de edición (Claude Code CLI)...");
    editPlan = await generateEditPlan({
      scriptText,
      imageFiles,
      audioDurationInSeconds: tts.durationInSeconds,
    });
  }
  console.log(`✅ Plan de edición: ${editPlan.scenes.length} escenas`);

  const reelProps: ReelProps = ReelPropsSchema.parse({
    scenes: editPlan.scenes.map((scene) => ({
      ...scene,
      imagePath: publicAssetPath(`reels/${reelName}/images/${scene.imageFile}`),
    })),
    audioSrc: publicAssetPath(`reels/${reelName}/audio.mp3`),
    words: tts.words,
    fps: DEFAULT_FPS,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });

  const outputDir = path.join(projectRoot, "output");
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, `${reelName}.props.json`),
    JSON.stringify(reelProps, null, 2),
  );

  console.log("📦 Empaquetando composition de Remotion...");
  const bundleLocation = await bundle({
    entryPoint: path.join(projectRoot, REMOTION_ENTRY_POINT),
    publicDir: path.join(projectRoot, "public"),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: REMOTION_COMPOSITION_ID,
    inputProps: reelProps,
  });

  const outputLocation = path.join(outputDir, `${reelName}.mp4`);
  console.log(`🎥 Renderizando ${composition.durationInFrames} frames a ${outputLocation}...`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps: reelProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   render: ${Math.round(progress * 100)}%`);
    },
  });
  process.stdout.write("\n");

  console.log(`✅ Reel listo: ${outputLocation}`);
  return outputLocation;
}

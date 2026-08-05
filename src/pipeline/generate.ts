import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { staticFile } from "remotion";
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  REMOTION_COMPOSITION_ID,
  REMOTION_ENTRY_POINT,
} from "./constants.ts";
import { generateEditPlan } from "./editPlan.ts";
import { type ReelProps, ReelPropsSchema } from "./schema.ts";
import { generateSpeech } from "./tts.ts";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const projectRoot = path.resolve(import.meta.dirname, "..", "..");

const naturalSort = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }).compare;

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
 * Genera un reel completo a partir de una carpeta de input con `script.txt` + `images/`:
 * TTS (ElevenLabs) → plan de edición (Claude Code CLI) → composition de Remotion → mp4.
 *
 * Devuelve la ruta absoluta del mp4 generado.
 */
export async function generateReel(inputDir: string): Promise<string> {
  const absoluteInputDir = path.resolve(inputDir);
  const reelName = path.basename(absoluteInputDir);
  const scriptPath = path.join(absoluteInputDir, "script.txt");
  const imagesDir = path.join(absoluteInputDir, "images");

  if (!existsSync(scriptPath)) {
    throw new Error(`No se encontró ${scriptPath}. Cada input necesita un script.txt.`);
  }
  if (!existsSync(imagesDir)) {
    throw new Error(`No se encontró ${imagesDir}. Cada input necesita una carpeta images/.`);
  }

  const scriptText = (await readFile(scriptPath, "utf-8")).trim();
  if (!scriptText) {
    throw new Error(`${scriptPath} está vacío.`);
  }

  const imageFiles = await listImageFiles(imagesDir);
  if (imageFiles.length === 0) {
    throw new Error(`${imagesDir} no tiene imágenes (.jpg/.jpeg/.png/.webp).`);
  }

  // Remotion solo puede servir assets que viven dentro de public/ (ver staticFile()) —
  // copiamos la copia de trabajo ahí, namespaced por reel para no pisar otros reels.
  const publicReelDir = path.join(projectRoot, "public", "reels", reelName);
  await rm(publicReelDir, { recursive: true, force: true });
  await mkdir(path.join(publicReelDir, "images"), { recursive: true });
  await Promise.all(
    imageFiles.map((file) =>
      cp(path.join(imagesDir, file), path.join(publicReelDir, "images", file)),
    ),
  );

  console.log(`🗣️  Generando voz (ElevenLabs) para ${imageFiles.length} imágenes...`);
  const tts = await generateSpeech(scriptText, publicReelDir);
  console.log(
    `✅ Audio generado: ${tts.durationInSeconds.toFixed(2)}s, ${tts.words.length} palabras`,
  );

  console.log("🎬 Generando plan de edición (Claude Code CLI)...");
  const editPlan = await generateEditPlan({
    scriptText,
    imageFiles,
    audioDurationInSeconds: tts.durationInSeconds,
  });
  console.log(`✅ Plan de edición: ${editPlan.scenes.length} escenas`);

  const reelProps: ReelProps = ReelPropsSchema.parse({
    scenes: editPlan.scenes.map((scene) => ({
      ...scene,
      imagePath: staticFile(`reels/${reelName}/images/${scene.imageFile}`),
    })),
    audioSrc: staticFile(`reels/${reelName}/audio.mp3`),
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

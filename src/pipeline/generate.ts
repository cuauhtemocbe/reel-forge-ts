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
  type ReelProps,
  ReelPropsSchema,
} from "./schema.ts";
import { generateSpeech } from "./tts.ts";

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
  const editPlanOverridePath = path.join(absoluteInputDir, "editPlan.json");

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

  let editPlan: EditPlan;
  if (existsSync(editPlanOverridePath)) {
    console.log("🎬 Usando editPlan.json (transición/Ken Burns fijados a mano)...");
    const overrideRaw = JSON.parse(await readFile(editPlanOverridePath, "utf-8"));
    const override = EditPlanOverrideSchema.parse(overrideRaw);

    const overrideFiles = override.scenes.map((scene) => scene.imageFile);
    const missing = imageFiles.filter((file) => !overrideFiles.includes(file));
    const extra = overrideFiles.filter((file) => !imageFiles.includes(file));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `${editPlanOverridePath} no coincide con ${imagesDir}. ` +
          `Faltan: [${missing.join(", ")}]. Sobran: [${extra.join(", ")}].`,
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

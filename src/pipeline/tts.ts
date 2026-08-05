import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type ElevenLabs, ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { type TtsResult, TtsResultSchema, type WordTimestamp } from "./schema.ts";

type CharacterAlignmentResponseModel = ElevenLabs.CharacterAlignmentResponseModel;

/** Voz premade "Rachel" — usada solo como fallback si ELEVENLABS_VOICE_ID no está seteado. */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/**
 * Agrupa la alineación por carácter que devuelve ElevenLabs en timestamps por palabra,
 * partiendo en cualquier corrida de whitespace. Cada palabra hereda el start del primer
 * carácter y el end del último carácter que la compone.
 */
export function alignmentToWords(alignment: CharacterAlignmentResponseModel): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  let current: { chars: string[]; start: number; end: number } | null = null;

  alignment.characters.forEach((char, i) => {
    const start = alignment.characterStartTimesSeconds[i];
    const end = alignment.characterEndTimesSeconds[i];
    if (start === undefined || end === undefined) return;

    if (/\s/.test(char)) {
      if (current) {
        words.push({ word: current.chars.join(""), start: current.start, end: current.end });
        current = null;
      }
      return;
    }

    if (!current) {
      current = { chars: [char], start, end };
    } else {
      current.chars.push(char);
      current.end = end;
    }
  });

  if (current) {
    const finalWord: { chars: string[]; start: number; end: number } = current;
    words.push({ word: finalWord.chars.join(""), start: finalWord.start, end: finalWord.end });
  }

  return words;
}

/**
 * Genera la voz del guion vía ElevenLabs (con timestamps por palabra para los captions
 * animados) y guarda el audio como mp3 en `outputDir/audio.mp3`.
 */
export async function generateSpeech(scriptText: string, outputDir: string): Promise<TtsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY no está seteada. Copiá .env.example a .env y completá tu API key de ElevenLabs.",
    );
  }

  const client = new ElevenLabsClient({ apiKey });
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text: scriptText,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  if (!response.alignment) {
    throw new Error("ElevenLabs no devolvió alineación de timestamps para el audio generado.");
  }

  const audioPath = join(outputDir, "audio.mp3");
  await writeFile(audioPath, Buffer.from(response.audioBase64, "base64"));

  const words = alignmentToWords(response.alignment);
  const lastEnd = words.at(-1)?.end ?? 0;

  return TtsResultSchema.parse({
    audioPath,
    durationInSeconds: lastEnd,
    words,
  });
}

function ttsCachePath(outputDir: string): string {
  return join(outputDir, "tts.json");
}

/**
 * Persiste un `TtsResult` como `tts.json` en `outputDir`, junto al `audio.mp3` que ya
 * escribió `generateSpeech`. Es el caché que `--mode video` reusa para saltear ElevenLabs.
 */
export async function saveTtsCache(outputDir: string, result: TtsResult): Promise<void> {
  await writeFile(ttsCachePath(outputDir), JSON.stringify(result, null, 2));
}

/**
 * Lee y valida el `tts.json` que dejó una corrida anterior en modo `all`/`audio`, para que
 * `--mode video` pueda reusar el audio ya generado sin llamar a ElevenLabs. Tira un error
 * accionable si nunca se corrió, o si el audio.mp3 que referencia ya no está en disco.
 */
export async function loadCachedTts(outputDir: string): Promise<TtsResult> {
  const cachePath = ttsCachePath(outputDir);
  if (!existsSync(cachePath)) {
    throw new Error(
      `No se encontró ${cachePath}. Corré --mode all o --mode audio primero para generar el audio.`,
    );
  }

  const raw = JSON.parse(await readFile(cachePath, "utf-8"));
  const result = TtsResultSchema.parse(raw);

  if (!existsSync(result.audioPath)) {
    throw new Error(
      `${cachePath} existe pero no se encontró ${result.audioPath}. Corré --mode all o --mode audio de nuevo.`,
    );
  }

  return result;
}

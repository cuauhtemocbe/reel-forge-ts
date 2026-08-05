import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TtsResult } from "../pipeline/schema.ts";
import { alignmentToWords, loadCachedTts, saveTtsCache } from "../pipeline/tts.ts";

function alignment(text: string, msPerChar = 100): ElevenLabs.CharacterAlignmentResponseModel {
  const characters = text.split("");
  const characterStartTimesSeconds = characters.map((_, i) => (i * msPerChar) / 1000);
  const characterEndTimesSeconds = characters.map((_, i) => ((i + 1) * msPerChar) / 1000);
  return { characters, characterStartTimesSeconds, characterEndTimesSeconds };
}

describe("alignmentToWords", () => {
  it("agrupa caracteres en palabras separadas por espacios", () => {
    const words = alignmentToWords(alignment("hola mundo"));
    expect(words.map((w) => w.word)).toEqual(["hola", "mundo"]);
  });

  it("cada palabra hereda el start del primer char y el end del último", () => {
    const words = alignmentToWords(alignment("hi there", 100));
    expect(words[0]).toEqual({ word: "hi", start: 0, end: 0.2 });
    // "there" empieza en el índice 3 (después de "hi "), termina en el índice 7 (8 chars, 0-indexed)
    expect(words[1]?.word).toBe("there");
    expect(words[1]?.start).toBeCloseTo(0.3);
  });

  it("colapsa espacios múltiples sin generar palabras vacías", () => {
    const words = alignmentToWords(alignment("hola   mundo"));
    expect(words.map((w) => w.word)).toEqual(["hola", "mundo"]);
  });

  it("devuelve vacío para un texto en blanco", () => {
    expect(alignmentToWords(alignment("   "))).toEqual([]);
  });
});

describe("saveTtsCache / loadCachedTts", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "reel-forge-tts-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const fakeResult: Omit<TtsResult, "audioPath"> = {
    durationInSeconds: 5.2,
    words: [{ word: "hola", start: 0, end: 0.4 }],
  };

  it("round-trip: lo que guarda saveTtsCache lo devuelve loadCachedTts", async () => {
    const audioPath = join(dir, "audio.mp3");
    await writeFile(audioPath, "fake-mp3-bytes");
    const result: TtsResult = { ...fakeResult, audioPath };

    await saveTtsCache(dir, result);

    await expect(loadCachedTts(dir)).resolves.toEqual(result);
  });

  it("lanza un error accionable si no existe tts.json (nunca corrió --mode all/audio)", async () => {
    await expect(loadCachedTts(dir)).rejects.toThrow(/--mode all.*--mode audio/s);
  });

  it("lanza un error si tts.json existe pero audio.mp3 no está en disco", async () => {
    const audioPath = join(dir, "audio.mp3");
    await saveTtsCache(dir, { ...fakeResult, audioPath });
    // audio.mp3 nunca se escribió, a diferencia del caso feliz de arriba.

    await expect(loadCachedTts(dir)).rejects.toThrow(/audio\.mp3/);
  });

  it("lanza un error si tts.json no es JSON válido", async () => {
    await writeFile(join(dir, "tts.json"), "esto no es json");

    await expect(loadCachedTts(dir)).rejects.toThrow();
  });

  it("lanza un error si tts.json no cumple TtsResultSchema", async () => {
    await writeFile(join(dir, "tts.json"), JSON.stringify({ durationInSeconds: -1 }));

    await expect(loadCachedTts(dir)).rejects.toThrow();
  });
});

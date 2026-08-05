import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { describe, expect, it } from "vitest";
import { alignmentToWords } from "../pipeline/tts.ts";

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

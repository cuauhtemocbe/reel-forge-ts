import { describe, expect, it } from "vitest";
import { EditPlanSchema, ReelPropsSchema, TtsResultSchema } from "../pipeline/schema.ts";

describe("EditPlanSchema", () => {
  it("acepta un plan válido", () => {
    const result = EditPlanSchema.safeParse({
      scenes: [
        { imageFile: "1.jpg", durationInSeconds: 3, transition: "none", kenBurns: "zoom-in" },
        { imageFile: "2.jpg", durationInSeconds: 4, transition: "fade", kenBurns: "pan-left" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza una escena sin imágenes", () => {
    const result = EditPlanSchema.safeParse({ scenes: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza una duración fuera de rango", () => {
    const result = EditPlanSchema.safeParse({
      scenes: [
        { imageFile: "1.jpg", durationInSeconds: 30, transition: "none", kenBurns: "zoom-in" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un preset de Ken Burns desconocido", () => {
    const result = EditPlanSchema.safeParse({
      scenes: [{ imageFile: "1.jpg", durationInSeconds: 3, transition: "none", kenBurns: "spin" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("TtsResultSchema", () => {
  it("acepta un resultado de TTS válido", () => {
    const result = TtsResultSchema.safeParse({
      audioPath: "/tmp/audio.mp3",
      durationInSeconds: 5.2,
      words: [{ word: "hola", start: 0, end: 0.4 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("ReelPropsSchema", () => {
  it("acepta props completas para el composition de Remotion", () => {
    const result = ReelPropsSchema.safeParse({
      scenes: [
        {
          imageFile: "1.jpg",
          imagePath: "reels/example/images/1.jpg",
          durationInSeconds: 3,
          transition: "none",
          kenBurns: "zoom-in",
        },
      ],
      audioSrc: "reels/example/audio.mp3",
      words: [{ word: "hola", start: 0, end: 0.4 }],
      fps: 30,
      width: 1080,
      height: 1920,
    });
    expect(result.success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  EditPlanSchema,
  GenerateModeSchema,
  OutroConfigSchema,
  OutroSchema,
  ReelPropsSchema,
  TtsResultSchema,
} from "../pipeline/schema.ts";

describe("GenerateModeSchema", () => {
  it.each(["all", "audio", "video"])("acepta el modo %s", (mode) => {
    expect(GenerateModeSchema.safeParse(mode).success).toBe(true);
  });

  it("rechaza un modo desconocido", () => {
    expect(GenerateModeSchema.safeParse("invalido").success).toBe(false);
  });

  it("rechaza un valor vacío", () => {
    expect(GenerateModeSchema.safeParse("").success).toBe(false);
  });
});

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

describe("OutroConfigSchema", () => {
  it("acepta un outro.json válido", () => {
    const result = OutroConfigSchema.safeParse({
      logo: "logo.jpg",
      bullets: ["Seguridad certificada", "Grupos para principiantes"],
      cta: "Tu primer paso hacia arriba empieza hoy",
      ctaUrl: "facebook.com/elmurotex",
      durationInSeconds: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza una lista de bullets vacía", () => {
    const result = OutroConfigSchema.safeParse({
      logo: "logo.jpg",
      bullets: [],
      cta: "CTA",
      ctaUrl: "example.com",
      durationInSeconds: 4,
    });
    expect(result.success).toBe(false);
  });
});

describe("OutroSchema", () => {
  it("acepta un outro ya resuelto (logoSrc en vez de logo)", () => {
    const result = OutroSchema.safeParse({
      logoSrc: "/public/reels/example/logo.jpg",
      bullets: ["Seguridad certificada"],
      cta: "Tu primer paso hacia arriba empieza hoy",
      ctaUrl: "facebook.com/elmurotex",
      durationInSeconds: 4,
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

  it("acepta props con una tarjeta final (outro) incluida", () => {
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
      outro: {
        logoSrc: "/public/reels/example/logo.jpg",
        bullets: ["Seguridad certificada"],
        cta: "Tu primer paso hacia arriba empieza hoy",
        ctaUrl: "facebook.com/elmurotex",
        durationInSeconds: 4,
      },
    });
    expect(result.success).toBe(true);
  });
});

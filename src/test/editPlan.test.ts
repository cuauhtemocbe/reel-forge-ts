import { describe, expect, it } from "vitest";
import { extractJson, resolveEditPlanOverride } from "../pipeline/editPlan.ts";
import type { EditPlanOverride } from "../pipeline/schema.ts";

describe("extractJson", () => {
  it("parsea JSON plano", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("extrae JSON de un bloque de código markdown ```json ... ```", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extrae JSON de un bloque de código markdown sin el lenguaje", () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignora espacios en blanco alrededor del JSON plano", () => {
    expect(extractJson('  \n{"a":1}\n  ')).toEqual({ a: 1 });
  });

  it("lanza si el texto no es JSON válido", () => {
    expect(() => extractJson("esto no es json")).toThrow();
  });
});

describe("resolveEditPlanOverride", () => {
  const override: EditPlanOverride = {
    scenes: [
      { imageFile: "a.jpg", weight: 1, transition: "none", kenBurns: "zoom-in" },
      { imageFile: "b.jpg", weight: 1, transition: "fade", kenBurns: "zoom-out" },
      { imageFile: "c.jpg", weight: 2, transition: "wipe-left", kenBurns: "pan-up" },
    ],
  };

  it("reparte la duración proporcionalmente al peso de cada escena", () => {
    const plan = resolveEditPlanOverride(override, 20);
    expect(plan.scenes.map((s) => s.durationInSeconds)).toEqual([5, 5, 10]);
  });

  it("preserva transición, Ken Burns e imagen de cada escena en el mismo orden", () => {
    const plan = resolveEditPlanOverride(override, 20);
    expect(plan.scenes.map((s) => s.imageFile)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(plan.scenes.map((s) => s.transition)).toEqual(["none", "fade", "wipe-left"]);
    expect(plan.scenes.map((s) => s.kenBurns)).toEqual(["zoom-in", "zoom-out", "pan-up"]);
  });

  it("aplica el piso de 1 segundo cuando el peso proporcional da menos", () => {
    const plan = resolveEditPlanOverride(override, 3);
    expect(plan.scenes[0]?.durationInSeconds).toBe(1);
  });

  it("aplica el techo de 15 segundos cuando el peso proporcional da más", () => {
    const plan = resolveEditPlanOverride(override, 400);
    expect(plan.scenes[2]?.durationInSeconds).toBe(15);
  });
});

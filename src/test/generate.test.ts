import { describe, expect, it } from "vitest";
import { normalizeScriptText } from "../pipeline/generate.ts";

describe("normalizeScriptText", () => {
  it("agrega un espacio después de una coma pegada a la siguiente palabra", () => {
    expect(normalizeScriptText("Hola,mundo")).toBe("Hola, mundo");
  });

  it("agrega un espacio después de un punto pegado a la siguiente palabra", () => {
    expect(normalizeScriptText("Fin.Otra oración")).toBe("Fin. Otra oración");
  });

  it("agrega un espacio después de signos de exclamación e interrogación", () => {
    expect(normalizeScriptText("¿Qué?Sí!Vamos")).toBe("¿Qué? Sí! Vamos");
  });

  it("no toca la puntuación que ya tiene un espacio después", () => {
    expect(normalizeScriptText("Hola, mundo. Chau.")).toBe("Hola, mundo. Chau.");
  });

  it("no inserta un espacio dentro de puntuación compuesta como ¿? o !?", () => {
    expect(normalizeScriptText("¡Vamos!?")).toBe("¡Vamos!?");
  });

  it("colapsa espacios múltiples en uno solo, sin tocar saltos de línea", () => {
    expect(normalizeScriptText("Hola   mundo\n\nOtro párrafo")).toBe("Hola mundo\n\nOtro párrafo");
  });

  it("recorta espacios al principio y al final", () => {
    expect(normalizeScriptText("  Hola mundo  ")).toBe("Hola mundo");
  });
});

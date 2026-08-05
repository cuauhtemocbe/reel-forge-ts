import { describe, expect, it } from "vitest";
import type { WordTimestamp } from "../pipeline/schema.ts";
import { paginateBySentence } from "../remotion/captionPages.ts";

function words(...specs: [string, number, number][]): WordTimestamp[] {
  return specs.map(([word, start, end]) => ({ word, start, end }));
}

describe("paginateBySentence", () => {
  it("devuelve una sola página para una oración completa", () => {
    const pages = paginateBySentence(
      words(["¿Sabes", 0, 0.3], ["qué", 0.3, 0.5], ["arriba?", 0.5, 0.9]),
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]?.tokens.map((t) => t.text)).toEqual(["¿Sabes", "qué", "arriba?"]);
  });

  it("corta una página nueva después de ./!/?", () => {
    const pages = paginateBySentence(
      words(["Hola.", 0, 0.3], ["Chau", 1, 1.3], ["mundo.", 1.3, 1.6]),
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]?.tokens.map((t) => t.text)).toEqual(["Hola."]);
    expect(pages[1]?.tokens.map((t) => t.text)).toEqual(["Chau", "mundo."]);
  });

  it("nunca deja una oración partida entre dos páginas", () => {
    // Reproduce el bug reportado: "¿Sabes qué se siente llegar hasta arriba?" no debe
    // dividirse en "...hasta" / "arriba? Si..." — la oración completa es una sola página.
    const pages = paginateBySentence(
      words(
        ["¿Sabes", 0, 0.3],
        ["qué", 0.3, 0.5],
        ["se", 0.5, 0.6],
        ["siente", 0.6, 0.9],
        ["llegar", 0.9, 1.2],
        ["hasta", 1.2, 1.4],
        ["arriba?", 1.4, 1.8],
        ["Si", 2.0, 2.2],
        ["le", 2.2, 2.3],
        ["tienes", 2.3, 2.6],
        ["miedo.", 2.6, 2.9],
      ),
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]?.tokens.map((t) => t.text)).toEqual([
      "¿Sabes",
      "qué",
      "se",
      "siente",
      "llegar",
      "hasta",
      "arriba?",
    ]);
    expect(pages[1]?.tokens.map((t) => t.text)).toEqual(["Si", "le", "tienes", "miedo."]);
  });

  it("agrega como última página las palabras finales sin puntuación de cierre", () => {
    const pages = paginateBySentence(
      words(["Hola.", 0, 0.3], ["mundo", 1, 1.3], ["sin", 1.3, 1.5], ["punto", 1.5, 1.8]),
    );
    expect(pages).toHaveLength(2);
    expect(pages[1]?.tokens.map((t) => t.text)).toEqual(["mundo", "sin", "punto"]);
  });

  it("extiende el final de cada página hasta el inicio de la siguiente (sin parpadeo en blanco)", () => {
    const pages = paginateBySentence(words(["Hola.", 0, 0.3], ["Chau.", 1, 1.3]));
    expect(pages[0]?.endMs).toBe(pages[1]?.startMs);
  });

  it("la última página termina en el fin de su última palabra", () => {
    const pages = paginateBySentence(words(["Hola.", 0, 0.3]));
    expect(pages[0]?.endMs).toBe(300);
  });

  it("devuelve una lista vacía para cero palabras", () => {
    expect(paginateBySentence([])).toEqual([]);
  });
});

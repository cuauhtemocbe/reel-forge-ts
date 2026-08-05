import { describe, expect, it } from "vitest";
import { extractJson } from "../pipeline/editPlan.ts";

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

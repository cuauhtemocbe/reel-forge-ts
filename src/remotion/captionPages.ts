import type { WordTimestamp } from "../pipeline/schema.ts";

export interface CaptionToken {
  text: string;
  fromMs: number;
  toMs: number;
}

export interface CaptionPage {
  startMs: number;
  endMs: number;
  tokens: CaptionToken[];
}

const SENTENCE_END_RE = /[.!?…]+["'”’)\]]*$/;

function toPage(tokens: CaptionToken[]): CaptionPage {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  if (!first || !last) {
    throw new Error("toPage() no puede recibir una lista de tokens vacía");
  }
  return { startMs: first.fromMs, endMs: last.toMs, tokens };
}

/**
 * Agrupa las palabras en páginas de caption por oración completa (corta después de
 * ./!/…), en vez de por una ventana de tiempo fija como hacía createTikTokStyleCaptions
 * — esa agrupa solo por duración acumulada, sin noción de dónde termina una idea, y podía
 * cortar una oración a la mitad (ver bug: "...hasta" quedaba separado de "arriba? Si...").
 * Cada página queda visible hasta que arranca la siguiente, para que no haya un parpadeo
 * en blanco durante la pausa entre oraciones.
 */
export function paginateBySentence(words: WordTimestamp[]): CaptionPage[] {
  const pages: CaptionPage[] = [];
  let current: CaptionToken[] = [];

  for (const word of words) {
    current.push({ text: word.word, fromMs: word.start * 1000, toMs: word.end * 1000 });
    if (SENTENCE_END_RE.test(word.word)) {
      pages.push(toPage(current));
      current = [];
    }
  }
  if (current.length > 0) {
    pages.push(toPage(current));
  }

  for (let i = 0; i < pages.length - 1; i++) {
    const page = pages[i];
    const next = pages[i + 1];
    if (page && next) {
      page.endMs = next.startMs;
    }
  }

  return pages;
}

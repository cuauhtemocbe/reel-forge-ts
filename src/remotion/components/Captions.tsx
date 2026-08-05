import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { WordTimestamp } from "../../pipeline/schema.ts";
import { paginateBySentence } from "../captionPages.ts";

interface CaptionsProps {
  words: WordTimestamp[];
}

/** Palabras de frases clave de venta (nombre, ubicación, argumentos de seguridad) que se
 * destacan en color de acento aunque no sean la palabra activa, para que la frase completa
 * resalte del resto del guion en vez de solo la palabra que se está narrando en ese frame. */
const ACCENT_WORDS = new Set([
  "mayra",
  "muro",
  "seguridad",
  "certificada",
  "certificado",
  "instructor",
  "experiencia",
  "excusas",
  "ventanas",
  "hidalgo",
  "tex",
]);

function isAccentWord(text: string): boolean {
  return ACCENT_WORDS.has(text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
}

/** Captions animados estilo karaoke: agrupa el guion en páginas por oración completa (ver
 * paginateBySentence.ts) y resalta la palabra que se está narrando en cada frame. */
export const Captions: React.FC<CaptionsProps> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  if (words.length === 0) return null;

  const pages = paginateBySentence(words);
  const currentPage = pages.find((page) => currentMs >= page.startMs && currentMs < page.endMs);

  if (!currentPage) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 180 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "85%",
          gap: "0.5em",
        }}
      >
        {currentPage.tokens.map((token) => {
          const isActive = currentMs >= token.fromMs && currentMs < token.toMs;
          const isPast = currentMs >= token.toMs;
          const isAccent = isAccentWord(token.text);
          return (
            <span
              key={token.fromMs}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 68,
                lineHeight: 1.2,
                color: isActive ? "#ffe94a" : isAccent ? "#ff5a36" : "#ffffff",
                WebkitTextStroke: "10px black",
                paintOrder: "stroke fill",
                opacity: isPast || isActive ? 1 : 0.75,
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

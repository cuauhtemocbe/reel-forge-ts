import { type Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { WordTimestamp } from "../../pipeline/schema.ts";

interface CaptionsProps {
  words: WordTimestamp[];
}

/** Cuánto tiempo puede separar a dos palabras para seguir agrupadas en la misma
 * "página" de captions en pantalla — más alto agrupa más palabras juntas por página. */
const COMBINE_TOKENS_WITHIN_MS = 1200;

/** Captions animados estilo karaoke: agrupa el guion en páginas cortas (vía
 * @remotion/captions) y resalta la palabra que se está narrando en cada frame. */
export const Captions: React.FC<CaptionsProps> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  if (words.length === 0) return null;

  const captions: Caption[] = words.map((w) => ({
    text: w.word,
    startMs: w.start * 1000,
    endMs: w.end * 1000,
    timestampMs: null,
    confidence: null,
  }));

  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: COMBINE_TOKENS_WITHIN_MS,
  });

  const currentPage = pages.find(
    (page) => currentMs >= page.startMs && currentMs < page.startMs + page.durationMs,
  );

  if (!currentPage) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 180 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "85%",
          gap: "0.35em",
        }}
      >
        {currentPage.tokens.map((token) => {
          const isActive = currentMs >= token.fromMs && currentMs < token.toMs;
          const isPast = currentMs >= token.toMs;
          return (
            <span
              key={token.fromMs}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 68,
                lineHeight: 1.2,
                color: isActive ? "#ffe94a" : "#ffffff",
                WebkitTextStroke: "10px black",
                paintOrder: "stroke fill",
                opacity: isPast || isActive ? 1 : 0.75,
                transform: isActive ? "scale(1.08)" : "scale(1)",
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

import { AbsoluteFill, Img } from "remotion";
import type { Outro } from "../../pipeline/schema.ts";
import { fontFamily } from "../font.ts";

// Colores tomados directo del logo (verde lima y celeste) para que la tarjeta final se
// sienta parte de la misma marca en vez de reusar el dorado de los captions.
const GREEN = "#acc825";
const BLUE = "#2cbcee";

/** Tarjeta final de marca: logo + bullets + CTA. Es contenido puramente visual (nunca pasa
 * por ElevenLabs ni por los captions animados) que se agrega después de la última escena. */
export const EndCard: React.FC<Outro> = ({ logoSrc, bullets, cta, ctaUrl }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 90px",
      }}
    >
      <Img
        src={logoSrc}
        style={{ width: 260, height: 260, objectFit: "contain", marginBottom: 56 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 64 }}>
        {bullets.map((bullet) => (
          <div key={bullet} style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: GREEN,
                flexShrink: 0,
              }}
            />
            <span style={{ fontFamily, fontWeight: 700, fontSize: 42, color: "#fafafa" }}>
              {bullet}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 48,
          color: "#fafafa",
          textAlign: "center",
          lineHeight: 1.3,
          marginBottom: 32,
        }}
      >
        {cta}
      </div>

      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 36,
          color: "#000000",
          backgroundColor: BLUE,
          borderRadius: 999,
          padding: "16px 44px",
        }}
      >
        {ctaUrl}
      </div>
    </AbsoluteFill>
  );
};

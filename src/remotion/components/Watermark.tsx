import { AbsoluteFill, Img } from "remotion";
import { fontFamily } from "../font.ts";

interface WatermarkProps {
  logoSrc: string;
  handle: string;
}

/** Bug de marca persistente durante las escenas principales (logo chico + handle, esquina
 * superior izquierda) — a diferencia de EndCard, que solo se ve en la tarjeta final, esto
 * mantiene el reel identificable si se recorta, descarga o resube fuera de la app. */
export const Watermark: React.FC<WatermarkProps> = ({ logoSrc, handle }) => {
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-start", padding: 48 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          borderRadius: 999,
          padding: "8px 22px 8px 8px",
        }}
      >
        <Img src={logoSrc} style={{ width: 40, height: 40, objectFit: "contain" }} />
        <span style={{ fontFamily, fontWeight: 700, fontSize: 26, color: "#fafafa" }}>
          {handle}
        </span>
      </div>
    </AbsoluteFill>
  );
};

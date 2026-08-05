import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import type { KenBurnsPreset } from "../../pipeline/schema.ts";

interface KenBurnsRange {
  scaleFrom: number;
  scaleTo: number;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
}

/** Rangos de zoom (scale) y pan (x/y en % del tamaño de la imagen) por preset.
 * Los presets de pan mantienen un scale fijo > 1 para tener margen de sobra y que
 * el paneo nunca deje ver el borde de la imagen. */
const PRESETS: Record<KenBurnsPreset, KenBurnsRange> = {
  "zoom-in": { scaleFrom: 1.0, scaleTo: 1.15, xFrom: 0, xTo: 0, yFrom: 0, yTo: 0 },
  "zoom-out": { scaleFrom: 1.15, scaleTo: 1.0, xFrom: 0, xTo: 0, yFrom: 0, yTo: 0 },
  "pan-left": { scaleFrom: 1.12, scaleTo: 1.12, xFrom: 4, xTo: -4, yFrom: 0, yTo: 0 },
  "pan-right": { scaleFrom: 1.12, scaleTo: 1.12, xFrom: -4, xTo: 4, yFrom: 0, yTo: 0 },
  "pan-up": { scaleFrom: 1.12, scaleTo: 1.12, xFrom: 0, xTo: 0, yFrom: 4, yTo: -4 },
  "pan-down": { scaleFrom: 1.12, scaleTo: 1.12, xFrom: 0, xTo: 0, yFrom: -4, yTo: 4 },
  "zoom-in-pan-left": { scaleFrom: 1.0, scaleTo: 1.18, xFrom: 3, xTo: -3, yFrom: 0, yTo: 0 },
  "zoom-in-pan-right": { scaleFrom: 1.0, scaleTo: 1.18, xFrom: -3, xTo: 3, yFrom: 0, yTo: 0 },
};

interface KenBurnsImageProps {
  src: string;
  durationInFrames: number;
  preset: KenBurnsPreset;
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({ src, durationInFrames, preset }) => {
  const frame = useCurrentFrame();
  const range = PRESETS[preset];

  const scale = interpolate(frame, [0, durationInFrames], [range.scaleFrom, range.scaleTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, durationInFrames], [range.xFrom, range.xTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, durationInFrames], [range.yFrom, range.yTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${x}%, ${y}%)`,
        }}
      />
    </AbsoluteFill>
  );
};

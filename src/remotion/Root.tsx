import { Composition } from "remotion";
import {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  REMOTION_COMPOSITION_ID,
} from "../pipeline/constants.ts";
import type { ReelProps } from "../pipeline/schema.ts";
import { ReelComposition, TRANSITION_DURATION_IN_FRAMES } from "./ReelComposition.tsx";

// Sin escenas por defecto: la composition solo se usa con props reales, generadas por
// el pipeline (ver src/pipeline/generate.ts) y pasadas vía --props al renderizar. No le
// pasamos `schema` al <Composition> de abajo a propósito — la validación de estas props
// ya ocurre en el pipeline (ReelPropsSchema.parse), y un default con 0 escenas violaría
// ese schema si Remotion Studio lo validara automáticamente al cargar.
const defaultProps: ReelProps = {
  scenes: [],
  audioSrc: "",
  words: [],
  fps: DEFAULT_FPS,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
};

function totalDurationInFrames(props: ReelProps): number {
  const sceneFrames = props.scenes.reduce(
    (sum, scene) => sum + Math.round(scene.durationInSeconds * props.fps),
    0,
  );
  const segments = props.scenes.length + (props.outro ? 1 : 0);
  const transitionOverlap = Math.max(0, segments - 1) * TRANSITION_DURATION_IN_FRAMES;
  const outroFrames = props.outro ? Math.round(props.outro.durationInSeconds * props.fps) : 0;
  return Math.max(1, sceneFrames + outroFrames - transitionOverlap);
}

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={REMOTION_COMPOSITION_ID}
      component={ReelComposition}
      defaultProps={defaultProps}
      fps={DEFAULT_FPS}
      width={DEFAULT_WIDTH}
      height={DEFAULT_HEIGHT}
      durationInFrames={1}
      calculateMetadata={({ props }) => ({
        durationInFrames: totalDurationInFrames(props),
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
  );
};

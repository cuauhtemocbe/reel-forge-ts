import type { TransitionPresentation } from "@remotion/transitions";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { none } from "@remotion/transitions/none";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, Audio } from "remotion";
import type { ReelProps, TransitionType } from "../pipeline/schema.ts";
import { Captions } from "./components/Captions.tsx";
import { KenBurnsImage } from "./components/KenBurnsImage.tsx";

/** Cuántos frames dura el cruce entre dos escenas — se "come" ese tiempo de ambas
 * escenas adyacentes (comportamiento estándar de TransitionSeries de Remotion). */
export const TRANSITION_DURATION_IN_FRAMES = 15;

// Cada presentation (fade/slide/wipe/none) tiene sus propios PresentationProps —
// el cast a Record<string, unknown> las homogeneiza para poder devolver cualquiera
// desde una única función; TransitionSeries.Transition las consume de forma opaca.
type AnyTransitionPresentation = TransitionPresentation<Record<string, unknown>>;

function presentationFor(transition: TransitionType): AnyTransitionPresentation {
  switch (transition) {
    case "fade":
      return fade() as AnyTransitionPresentation;
    case "slide-left":
      return slide({ direction: "from-right" }) as AnyTransitionPresentation;
    case "slide-right":
      return slide({ direction: "from-left" }) as AnyTransitionPresentation;
    case "wipe-left":
      return wipe({ direction: "from-right" }) as AnyTransitionPresentation;
    case "wipe-right":
      return wipe({ direction: "from-left" }) as AnyTransitionPresentation;
    case "none":
      return none() as AnyTransitionPresentation;
    default: {
      const exhaustive: never = transition;
      throw new Error(`Transición desconocida: ${exhaustive}`);
    }
  }
}

export const ReelComposition: React.FC<ReelProps> = ({ scenes, audioSrc, words, fps }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {scenes.flatMap((scene, i) => {
          const durationInFrames = Math.round(scene.durationInSeconds * fps);
          const sequence = (
            <TransitionSeries.Sequence
              key={`scene-${scene.imageFile}`}
              durationInFrames={durationInFrames}
            >
              <KenBurnsImage
                src={scene.imagePath}
                durationInFrames={durationInFrames}
                preset={scene.kenBurns}
              />
            </TransitionSeries.Sequence>
          );

          if (i === 0) return [sequence];

          const transitionElement = (
            <TransitionSeries.Transition
              key={`transition-${scene.imageFile}`}
              presentation={presentationFor(scene.transition)}
              timing={linearTiming({ durationInFrames: TRANSITION_DURATION_IN_FRAMES })}
            />
          );

          return [transitionElement, sequence];
        })}
      </TransitionSeries>
      {audioSrc ? <Audio src={audioSrc} /> : null}
      <Captions words={words} />
    </AbsoluteFill>
  );
};

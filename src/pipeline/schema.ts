import { z } from "zod";

/** Modo de corrida de `pnpm generate`: `all` (default, TTS + plan + render), `audio`
 * (solo TTS, no renderiza) o `video` (reusa el TTS cacheado de una corrida anterior,
 * salta ElevenLabs y solo rehace plan de edición + render). */
export const GenerateModeSchema = z.enum(["all", "audio", "video"]);
export type GenerateMode = z.infer<typeof GenerateModeSchema>;

/** Transición de entrada de una escena hacia la siguiente imagen. */
export const TransitionTypeSchema = z.enum([
  "fade",
  "slide-left",
  "slide-right",
  "wipe-left",
  "wipe-right",
  "none",
]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

/** Presets de Ken Burns (zoom/pan) — enum cerrado en vez de valores numéricos libres
 * para que lo que decide Claude (rango de movimiento por escena) siempre sea válido
 * y visualmente razonable al mapearse a interpolate() en el composition. */
export const KenBurnsPresetSchema = z.enum([
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "pan-up",
  "pan-down",
  "zoom-in-pan-left",
  "zoom-in-pan-right",
]);
export type KenBurnsPreset = z.infer<typeof KenBurnsPresetSchema>;

/** Una escena del plan de edición: una imagen, su duración y su tratamiento visual. */
export const SceneSchema = z.object({
  imageFile: z.string().min(1),
  durationInSeconds: z.number().min(1).max(15),
  transition: TransitionTypeSchema,
  kenBurns: KenBurnsPresetSchema,
});
export type Scene = z.infer<typeof SceneSchema>;

/** Salida esperada de Claude Code CLI: el plan de edición completo del reel. */
export const EditPlanSchema = z.object({
  scenes: z.array(SceneSchema).min(1),
});
export type EditPlan = z.infer<typeof EditPlanSchema>;

/** Escena de un `editPlan.json` de override manual: transición y Ken Burns fijos elegidos
 * a mano en vez de por Claude, más un peso relativo — `resolveEditPlanOverride` reparte
 * la duración real del audio entre escenas proporcionalmente a estos pesos. */
export const SceneOverrideSchema = z.object({
  imageFile: z.string().min(1),
  weight: z.number().positive(),
  transition: TransitionTypeSchema,
  kenBurns: KenBurnsPresetSchema,
});
export type SceneOverride = z.infer<typeof SceneOverrideSchema>;

/** `editPlan.json` opcional en la carpeta de input: si existe, `generate.ts` lo usa en vez
 * de invocar a Claude Code CLI para decidir el plan de edición. */
export const EditPlanOverrideSchema = z.object({
  scenes: z.array(SceneOverrideSchema).min(1),
});
export type EditPlanOverride = z.infer<typeof EditPlanOverrideSchema>;

/** Timestamp de una palabra dentro del audio de voz generado por TTS. */
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});
export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

/** Resultado del paso de TTS: audio generado + alineación palabra por palabra. */
export const TtsResultSchema = z.object({
  audioPath: z.string(),
  durationInSeconds: z.number().positive(),
  words: z.array(WordTimestampSchema),
});
export type TtsResult = z.infer<typeof TtsResultSchema>;

/** Escena ya resuelta a una ruta de archivo absoluta, lista para Remotion. */
export const ResolvedSceneSchema = SceneSchema.extend({
  imagePath: z.string(),
});
export type ResolvedScene = z.infer<typeof ResolvedSceneSchema>;

/** Input props que recibe la composition de Remotion. */
export const ReelPropsSchema = z.object({
  scenes: z.array(ResolvedSceneSchema).min(1),
  audioSrc: z.string(),
  words: z.array(WordTimestampSchema),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ReelProps = z.infer<typeof ReelPropsSchema>;

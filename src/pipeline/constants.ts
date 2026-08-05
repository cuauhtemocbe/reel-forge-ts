/** Configuración de video compartida entre el composition de Remotion (src/remotion/Root.tsx)
 * y el orquestador del pipeline (src/pipeline/generate.ts) — una sola fuente de verdad. */
export const DEFAULT_FPS = 30;

// 1080x1920 = 9:16 vertical, el formato estándar de reels/shorts/TikTok.
export const DEFAULT_WIDTH = 1080;
export const DEFAULT_HEIGHT = 1920;

export const REMOTION_COMPOSITION_ID = "Reel";
export const REMOTION_ENTRY_POINT = "src/remotion/index.ts";

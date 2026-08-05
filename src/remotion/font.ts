import { loadFont } from "@remotion/google-fonts/Poppins";

// Se carga una sola vez a nivel de módulo (no en cada render de componente) — así lo
// recomienda @remotion/google-fonts, que además bloquea el render hasta que está lista.
// Compartido entre Captions.tsx y EndCard.tsx para no cargar la fuente dos veces.
export const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin", "latin-ext"],
});

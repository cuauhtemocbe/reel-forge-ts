import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { type EditPlan, EditPlanSchema } from "./schema.ts";

const execFileAsync = promisify(execFile);

export interface EditPlanInput {
  /** Guion completo tal como se le pasó al TTS. */
  scriptText: string;
  /** Nombres de archivo de las imágenes, en el orden en que deben aparecer en el reel. */
  imageFiles: string[];
  /** Duración del audio de voz generado — el plan debe cubrir aproximadamente este tiempo. */
  audioDurationInSeconds: number;
}

interface ClaudeJsonEnvelope {
  result?: string;
  is_error?: boolean;
}

function buildPrompt({ scriptText, imageFiles, audioDurationInSeconds }: EditPlanInput): string {
  return `Sos el editor de video de un reel vertical (estilo CapCut) generado a partir de un guion
narrado y una serie de imágenes fijas. Tu trabajo es decidir el plan de edición: cuánto dura
cada imagen en pantalla, qué transición la conecta con la siguiente y qué movimiento de
Ken Burns (zoom/pan) le da vida.

Guion narrado (el audio de voz generado a partir de este texto dura ${audioDurationInSeconds.toFixed(2)} segundos):
"""
${scriptText}
"""

Imágenes disponibles, EN ESTE ORDEN EXACTO (no reordenes, no omitas ninguna, usá cada una
exactamente una vez):
${imageFiles.map((file, i) => `${i + 1}. ${file}`).join("\n")}

Reglas:
- La suma de "durationInSeconds" de todas las escenas debe aproximarse a ${audioDurationInSeconds.toFixed(2)} segundos (± 1s), para que el video dure lo mismo que la voz.
- Cada escena dura entre 1 y 15 segundos.
- Variá los movimientos de Ken Burns y las transiciones entre escenas consecutivas para que no se sientan repetitivas, pero mantené coherencia con el tono del guion (ej. un momento dramático puede pedir un zoom-in lento; un cambio de tema puede pedir una transición más marcada).
- "transition" es la transición de ENTRADA de esa escena (cómo aparece reemplazando a la anterior). La primera escena usa "none".

Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin texto adicional, sin explicaciones) con esta forma exacta:

{
  "scenes": [
    {
      "imageFile": "<nombre de archivo, debe coincidir exactamente con uno de la lista>",
      "durationInSeconds": <número>,
      "transition": "fade" | "slide-left" | "slide-right" | "wipe-left" | "wipe-right" | "none",
      "kenBurns": "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "pan-up" | "pan-down" | "zoom-in-pan-left" | "zoom-in-pan-right"
    }
  ]
}`;
}

async function callClaude(prompt: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "claude",
    ["-p", prompt, "--output-format", "json", "--allowedTools", ""],
    { maxBuffer: 10 * 1024 * 1024 },
  );

  let envelope: ClaudeJsonEnvelope;
  try {
    envelope = JSON.parse(stdout) as ClaudeJsonEnvelope;
  } catch {
    throw new Error(`claude CLI no devolvió JSON válido en su envelope: ${stdout.slice(0, 500)}`);
  }

  if (envelope.is_error || !envelope.result) {
    throw new Error(`claude CLI devolvió un error: ${stdout.slice(0, 500)}`);
  }

  return envelope.result;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  return JSON.parse(raw);
}

/**
 * Invoca a Claude Code CLI en modo headless (`claude -p --output-format json`) para que
 * decida el plan de edición del reel a partir del guion y las imágenes disponibles.
 * Si la primera respuesta no valida contra el schema, se hace un único intento de reparación
 * pasándole el error de vuelta a Claude.
 */
export async function generateEditPlan(input: EditPlanInput): Promise<EditPlan> {
  const prompt = buildPrompt(input);
  const firstResult = await callClaude(prompt);

  try {
    return EditPlanSchema.parse(extractJson(firstResult));
  } catch (firstError) {
    const repairPrompt = `${prompt}

Tu respuesta anterior no fue JSON válido según lo pedido:
${firstResult}

Error de validación: ${String(firstError)}

Respondé de nuevo con SOLO el JSON corregido, sin markdown ni texto adicional.`;

    const secondResult = await callClaude(repairPrompt);
    return EditPlanSchema.parse(extractJson(secondResult));
  }
}

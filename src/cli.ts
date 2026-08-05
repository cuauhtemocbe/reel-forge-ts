import { parseArgs } from "node:util";
import { generateReel } from "./pipeline/generate.ts";
import { GenerateModeSchema } from "./pipeline/schema.ts";

function printUsageAndExit(): never {
  console.error("Uso: pnpm generate --input <carpeta> [--mode all|audio|video]");
  console.error("  <carpeta> debe contener script.txt e images/ (ver input/example/)");
  console.error("  --mode all   (default) TTS + plan de edición + render");
  console.error("  --mode audio solo TTS — no requiere images/ ni renderiza");
  console.error("  --mode video reusa el audio cacheado de una corrida anterior");
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: "string", short: "i" },
      mode: { type: "string", short: "m", default: "all" },
    },
  });

  if (!values.input) {
    printUsageAndExit();
  }

  const modeResult = GenerateModeSchema.safeParse(values.mode);
  if (!modeResult.success) {
    console.error(`❌ --mode inválido: "${values.mode}". Valores válidos: all, audio, video.`);
    process.exit(1);
  }

  await generateReel(values.input, modeResult.data);
}

main().catch((error: unknown) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});

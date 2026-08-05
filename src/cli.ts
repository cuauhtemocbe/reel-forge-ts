import { parseArgs } from "node:util";
import { generateReel } from "./pipeline/generate.ts";

function printUsageAndExit(): never {
  console.error("Uso: pnpm generate --input <carpeta>");
  console.error("  <carpeta> debe contener script.txt e images/ (ver input/example/)");
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: "string", short: "i" },
    },
  });

  if (!values.input) {
    printUsageAndExit();
  }

  await generateReel(values.input);
}

main().catch((error: unknown) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});

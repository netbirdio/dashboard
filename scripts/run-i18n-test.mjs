import { readFile } from "node:fs/promises";
import { rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const detectionPath = new URL("../src/i18n/detection.ts", import.meta.url);
const detectionOutputPath = new URL(
  "../src/i18n/detection.mjs",
  import.meta.url,
);
const configOutputPath = new URL(
  "../src/i18n/config.test.mjs",
  import.meta.url,
);
const sourcePath = new URL("../src/i18n/detection.test.ts", import.meta.url);
const outputPath = new URL("../src/i18n/detection.test.mjs", import.meta.url);

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
};
const transpile = (source) =>
  ts.transpileModule(source, { compilerOptions }).outputText;

const detectionSource = await readFile(detectionPath, "utf8");
const compiledDetectionSource = transpile(detectionSource).replace(
  'from "./config"',
  'from "./config.test.mjs"',
);
const testSource = (await readFile(sourcePath, "utf8")).replace(
  'import("./detection")',
  'import("./detection.mjs")',
);

await writeFile(
  configOutputPath,
  `export const locales = ["en", "zh"];
export const defaultLocale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
`,
);
await writeFile(detectionOutputPath, compiledDetectionSource);
await writeFile(outputPath, transpile(testSource));

const result = spawnSync(process.execPath, [outputPath.pathname], {
  stdio: "inherit",
});

await Promise.all([
  rm(detectionOutputPath, { force: true }),
  rm(configOutputPath, { force: true }),
  rm(outputPath, { force: true }),
]);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

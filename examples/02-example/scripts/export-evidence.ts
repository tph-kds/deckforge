// scripts/export-evidence.ts
//
// Produces the PPTX export evidence for the seed deck:
//   1. evidence/weight-of-the-web.pptx          - the exported archive
//   2. evidence/export-report.json              - machine-readable export report
//   3. evidence/export-summary.txt              - human-readable summary
//
// Run: npx tsx scripts/export-evidence.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedDeck } from "../src/deck/seed";
import { PptxExporter } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(root, "evidence");

async function main() {
  const deck = loadSeedDeck();
  const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
  const result = await exporter.export(deck);

  fs.mkdirSync(evidenceDir, { recursive: true });

  const pptxPath = path.join(evidenceDir, "weight-of-the-web.pptx");
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  fs.writeFileSync(pptxPath, bytes);

  const reportPath = path.join(evidenceDir, "export-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2));

  const counts = result.report.issues.reduce<Record<string, number>>((acc, issue) => {
    acc[`${issue.severity}:${issue.code}`] = (acc[`${issue.severity}:${issue.code}`] ?? 0) + 1;
    return acc;
  }, {});

  const slideCount = result.report.slides.length;
  const blockCount = result.report.slides.reduce(
    (sum, slide) => sum + slide.blocks.length,
    0,
  );
  const blocked = result.report.issues.filter((i) => i.severity === "error").length;

  const summary = [
    `Deck: ${deck.meta.title} (${deck.slides.length} slides, canvas ${deck.canvas.width}x${deck.canvas.height}px)`,
    `Export status: ${result.report.status}`,
    `Archive verified: ${result.archiveVerified}`,
    `PPTX: ${pptxPath} (${bytes.length} bytes)`,
    `Slides exported: ${slideCount}`,
    `Blocks exported: ${blockCount}`,
    `Issues: ${result.report.issues.length} (${blocked} errors)`,
    "",
    ...Object.entries(counts)
      .sort()
      .map(([code, n]) => `  ${code}: ${n}`),
  ].join("\n");

  const summaryPath = path.join(evidenceDir, "export-summary.txt");
  fs.writeFileSync(summaryPath, summary + "\n");

  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

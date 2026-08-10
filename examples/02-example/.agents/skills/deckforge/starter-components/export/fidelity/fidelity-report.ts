import type { DeckProject } from "../../deck-types";
import type { FidelityReport } from "../export-types";
import { calculateContentParity } from "./content-parity";
import { FIDELITY_POLICY } from "./fidelity-policy";
import type { FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";

export interface BuildFidelityReportInput {
  deck: DeckProject;
  blocks: FidelityBlockReport[];
  policy?: PptxFidelityPolicy;
}

export function countRepresentation(
  blocks: FidelityBlockReport[],
  rep: FidelityBlockReport["representation"],
): number {
  return blocks.filter((b) => b.representation === rep).length;
}

export function fidelityStatus(
  parity: number,
  blocks: FidelityBlockReport[],
  policy: PptxFidelityPolicy,
): FidelityReport["status"] {
  const hardRules = policy.hardRules;
  const hasError = blocks.some((b) => b.issues.some((i) => i.severity === "error"));
  if (hasError) return "failed";
  if (parity < hardRules.meaningfulContentRecall) return "failed";
  const omittedVisible = blocks.filter(
    (b) => b.status !== "skipped" && b.representation === "unsupported",
  );
  if (omittedVisible.length > 0) return "failed";
  const fallbackCount =
    countRepresentation(blocks, "raster") +
    countRepresentation(blocks, "svg") +
    countRepresentation(blocks, "expanded-build");
  if (fallbackCount > 0) return "complete-with-fallbacks";
  return "complete";
}

export function buildFidelityReport(input: BuildFidelityReportInput): FidelityReport {
  const { deck, blocks, policy = FIDELITY_POLICY } = input;
  const parity = calculateContentParity(deck, blocks, policy);
  const missingVisibleBlocks = blocks.filter(
    (b) => b.status !== "skipped" && b.representation === "unsupported",
  ).length;
  return {
    status: fidelityStatus(parity, blocks, policy),
    contentRecall: parity,
    missingVisibleBlocks,
    blocks,
  };
}

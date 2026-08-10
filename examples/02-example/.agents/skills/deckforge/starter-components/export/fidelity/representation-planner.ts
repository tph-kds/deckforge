import type { BlockExportStatus, ExportIssue, PptxSlideElement } from "../export-types";
import type { BlockRepresentation, FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";
import { FIDELITY_POLICY } from "./fidelity-policy";

export interface PlannerInput {
  blockId: string;
  hidden: boolean;
  status: BlockExportStatus;
  element?: PptxSlideElement;
  issues: ExportIssue[];
}

function repr(
  blockId: string,
  status: BlockExportStatus,
  issues: ExportIssue[],
  representation: BlockRepresentation,
  extras: Partial<Pick<FidelityBlockReport, "contentPreserved" | "editable" | "visualParity">> = {},
): FidelityBlockReport {
  return {
    blockId,
    status,
    issues,
    representation,
    contentPreserved: representation !== "unsupported",
    editable: representation === "native",
    visualParity: representation === "native" ? 1 : representation === "svg" ? 0.9 : 0.8,
    ...extras,
  };
}

export function planBlockRepresentation(
  input: PlannerInput,
  policy: PptxFidelityPolicy = FIDELITY_POLICY,
): FidelityBlockReport {
  const { blockId, hidden, status, element, issues } = input;
  if (hidden) {
    return repr(blockId, "skipped", issues, "unsupported", { contentPreserved: false, editable: false, visualParity: 0 });
  }
  const hasError = issues.some((issue) => issue.severity === "error");
  if (hasError || status === "unsupported") {
    return repr(blockId, "unsupported", issues, "unsupported", { contentPreserved: false, editable: false, visualParity: 0 });
  }
  const r: BlockRepresentation =
    element?.type === "svg"
      ? "svg"
      : status === "native"
        ? "native"
        : status === "rasterized"
          ? "raster"
          : status === "substituted"
            ? "expanded-build"
            : "unsupported";
  return repr(blockId, status, issues, r);
}

export function countRepresentation(
  blocks: FidelityBlockReport[],
  rep: BlockRepresentation,
): number {
  return blocks.filter((b) => b.representation === rep).length;
}

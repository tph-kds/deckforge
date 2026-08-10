import type { PptxFidelityPolicy } from "./fidelity-types";

export const FIDELITY_POLICY: PptxFidelityPolicy = {
  version: "1.0.0",
  defaultMode: "fidelity-first",
  priorities: ["content", "visual", "geometry", "editability", "file-size"],
  hardRules: {
    meaningfulContentRecall: 0.9,
    maxMissingVisibleBlocks: 0,
    silentOmissionAllowed: false,
    diagramSummaryFallbackAllowed: true,
  },
  representations: ["native", "svg", "raster", "expanded-build"],
};

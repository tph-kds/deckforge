// export/pptx/block-exporters/index.ts

import type { PptxBlockExporter } from "../../export-types";
import {
  textBlockExporter,
  headingBlockExporter,
  bulletsBlockExporter,
  calloutBlockExporter,
  citationBlockExporter,
  metricBlockExporter,
} from "./text";
import { processBlockExporter } from "./process";
import { imageBlockExporter } from "./image";
import { shapeBlockExporter } from "./shape";
import { tableBlockExporter } from "./table";
import { chartBlockExporter } from "./chart";
import { diagramBlockExporter } from "./diagram";
import { videoBlockExporter } from "./video";
import { fallbackBlockExporter } from "./fallback";

export const blockExporters: PptxBlockExporter[] = [
  textBlockExporter,
  headingBlockExporter,
  bulletsBlockExporter,
  calloutBlockExporter,
  citationBlockExporter,
  metricBlockExporter,
  processBlockExporter,
  imageBlockExporter,
  shapeBlockExporter,
  tableBlockExporter,
  chartBlockExporter,
  diagramBlockExporter,
  videoBlockExporter,
  fallbackBlockExporter,
];

export function getBlockExporter(type: string): PptxBlockExporter {
  return blockExporters.find((exporter) => exporter.type === type) ?? fallbackBlockExporter;
}

export function getExportability(type: string): string {
  return getBlockExporter(type).exportability;
}

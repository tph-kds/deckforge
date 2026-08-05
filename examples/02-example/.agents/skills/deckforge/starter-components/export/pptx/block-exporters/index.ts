import type { PptxBlockExporter } from "../../export-types";
import {
  textBlockExporter,
  headingBlockExporter,
  bulletsBlockExporter,
  calloutBlockExporter,
  citationBlockExporter,
  metricBlockExporter,
  processBlockExporter,
} from "./text";
import { imageBlockExporter } from "./image";
import { shapeBlockExporter } from "./shape";
import { tableBlockExporter } from "./table";
import { chartBlockExporter } from "./chart";
import { diagramBlockExporter } from "./diagram";
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
  fallbackBlockExporter,
];

export function getBlockExporter(type: string): PptxBlockExporter {
  return blockExporters.find((exporter) => exporter.type === type) ?? fallbackBlockExporter;
}

export function getExportability(type: string): string {
  return getBlockExporter(type).exportability;
}
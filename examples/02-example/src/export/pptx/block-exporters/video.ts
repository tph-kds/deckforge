import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderSnapshotSvg } from "../../fidelity/svg/svg-snapshot";
import { mapThemeColors } from "../pptx-theme";

interface VideoChapter {
  title?: unknown;
  summary?: unknown;
  keyPoints?: Array<unknown>;
}

interface VideoContent {
  url?: string;
  poster?: string;
  chapter?: VideoChapter;
}

interface VideoBlock {
  id: string;
  type: "video";
  content?: VideoContent;
  alt?: string;
  ariaLabel?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  frame?: { x?: number; y?: number; w?: number; h?: number };
}

export const videoBlockExporter: PptxBlockExporter = {
  type: "video",
  exportability: "poster-with-link",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const videoBlock = block as VideoBlock;
    const content = videoBlock.content ?? {};
    const chapter = content.chapter ?? {};
    const title =
      (typeof chapter.title === "string" ? chapter.title : "") ||
      content.url ||
      "Video";
    const summary = typeof chapter.summary === "string" ? chapter.summary : "";
    const keyPoints = (chapter.keyPoints ?? [])
      .filter((point): point is string => typeof point === "string")
      .map((point) => `\u2022 ${point}`)
      .join("\n");
    const body = [summary, keyPoints].filter(Boolean).join("\n");
    const x = videoBlock.x ?? videoBlock.frame?.x ?? 0;
    const y = videoBlock.y ?? videoBlock.frame?.y ?? 0;
    const w = videoBlock.w ?? videoBlock.frame?.w ?? ctx.slideWidth * 0.5;
    const h = videoBlock.h ?? videoBlock.frame?.h ?? ctx.slideHeight * 0.3;

    const theme = mapThemeColors(ctx.deck.theme);
    const svg = renderSnapshotSvg({
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
      title,
      text: body,
      alt: videoBlock.alt ?? videoBlock.ariaLabel ?? "",
      colors: {
        background: theme.background,
        border: theme.accent2,
        bodyColor: theme.text,
      },
    });

    const alt = videoBlock.alt ?? videoBlock.ariaLabel ?? "";
    return {
      status: "rasterized",
      issues: [
        {
          code: "no-fallback-produced",
          severity: "info",
          message: "Video content was exported as a static snapshot with its chapter summary",
          suggestedFix: "Provide a poster image to improve the visual representation",
          automaticFixAvailable: false,
        },
      ],
      element: {
        type: "svg",
        x,
        y,
        w,
        h,
        data: { svg, alt },
      },
    };
  },
};

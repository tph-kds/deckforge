// export/pptx/block-exporters/video.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderSnapshotSvg } from "../../fidelity/svg/svg-snapshot";
import { mapThemeColors } from "../pptx-theme";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import type { Block } from "../../../deck/types";

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

export const videoBlockExporter: PptxBlockExporter = {
  type: "video",
  exportability: "poster-with-link",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const videoBlock = block as Block;
    const frame = exportFrameOf(videoBlock);
    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(videoBlock.id, "video blocks require a resolved frame")],
      };
    }

    const content = (videoBlock.content ?? {}) as VideoContent;
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

    const theme = mapThemeColors(ctx.deck.theme);
    const svg = renderSnapshotSvg({
      width: Math.max(1, Math.round(frame.w)),
      height: Math.max(1, Math.round(frame.h)),
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
        elementId: videoBlock.id,
        ...frame,
        data: { svg, alt },
      },
    };
  },
};
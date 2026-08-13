// deck/image-import.ts
//
// Pure, node-testable decisions for turning a locally-chosen image file into an
// embeddable `data:` URI. The DOM wrapper (`importImageAsDataUri`) lives here
// too but is covered by e2e: the vitest environment is `node` and has no canvas.

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;

export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { w: number; h: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { w: width, h: height };
  const scale = maxEdge / longest;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

export function chooseOutputType(
  sourceMime: string,
  hasAlpha: boolean,
): "image/jpeg" | "image/png" {
  if (sourceMime === "image/png" && hasAlpha) return "image/png";
  return "image/jpeg";
}
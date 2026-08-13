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

function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

export function importImageAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("The selected file is not a readable image"));
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (width < 1 || height < 1) {
          reject(new Error("The selected image has no usable dimensions"));
          return;
        }
        const { w, h } = computeTargetSize(width, height);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not prepare the image for processing"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const type = chooseOutputType(file.type, hasTransparency(canvas));
        const uri = canvas.toDataURL(type, JPEG_QUALITY);
        if (!uri.startsWith("data:image/")) {
          reject(new Error("Could not encode the image"));
          return;
        }
        resolve(uri);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
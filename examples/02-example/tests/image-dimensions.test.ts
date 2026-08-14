import { describe, expect, it } from "vitest";
import { readImageSizeFromDataUri } from "../src/export/image-dimensions";

function dataUriFrom(bytes: number[], mime: string): string {
  const binary = String.fromCharCode(...bytes);
  return `data:${mime};base64,${btoa(binary)}`;
}

function pngBytes(width: number, height: number): number[] {
  return [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
    (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ];
}

function jpegBytes(width: number, height: number): number[] {
  const components = [0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00];
  return [
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    ...components,
  ];
}

function gifBytes(width: number, height: number): number[] {
  return [
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    width & 0xff, (width >>> 8) & 0xff,
    height & 0xff, (height >>> 8) & 0xff,
  ];
}

function webpBytes(width: number, height: number): number[] {
  const w1 = width - 1;
  const h1 = height - 1;
  return [
    0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x58,
    0x00, 0x00, 0x00, 0x00,
    0x00,
    0x00, 0x00, 0x00,
    w1 & 0xff, (w1 >>> 8) & 0xff, (w1 >>> 16) & 0xff,
    h1 & 0xff, (h1 >>> 8) & 0xff, (h1 >>> 16) & 0xff,
  ];
}

describe("readImageSizeFromDataUri", () => {
  it("reads PNG intrinsic dimensions", () => {
    expect(readImageSizeFromDataUri(dataUriFrom(pngBytes(640, 360), "image/png"))).toEqual({
      width: 640,
      height: 360,
    });
  });

  it("reads JPEG intrinsic dimensions", () => {
    expect(readImageSizeFromDataUri(dataUriFrom(jpegBytes(1280, 720), "image/jpeg"))).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it("reads GIF intrinsic dimensions", () => {
    expect(readImageSizeFromDataUri(dataUriFrom(gifBytes(320, 240), "image/gif"))).toEqual({
      width: 320,
      height: 240,
    });
  });

  it("reads WebP intrinsic dimensions", () => {
    expect(readImageSizeFromDataUri(dataUriFrom(webpBytes(800, 600), "image/webp"))).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("returns null for non-data or garbage payloads", () => {
    expect(readImageSizeFromDataUri("")).toBeNull();
    expect(readImageSizeFromDataUri("https://example.com/pic.png")).toBeNull();
    expect(readImageSizeFromDataUri(dataUriFrom([0xde, 0xad, 0xbe, 0xef], "application/octet-stream"))).toBeNull();
    expect(readImageSizeFromDataUri(dataUriFrom([0x89, 0x50, 0x4e, 0x47], "image/png"))).toBeNull();
  });

  it("returns null for a truncated PNG", () => {
    expect(readImageSizeFromDataUri(dataUriFrom(pngBytes(640, 360).slice(0, 12), "image/png"))).toBeNull();
  });
});

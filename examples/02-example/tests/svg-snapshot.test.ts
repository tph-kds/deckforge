import { describe, expect, it } from "vitest";
import { renderSnapshotSvg } from "../src/export/fidelity/svg/svg-snapshot";

describe("svg-snapshot", () => {
  it("renders a framed box with the block title, text, and alt text", () => {
    const svg = renderSnapshotSvg({
      width: 400,
      height: 200,
      title: "video",
      text: "Live product demo",
      alt: "Embedded video of the live app",
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain('<rect');
    expect(svg).toContain("video");
    expect(svg).toContain("Live product demo");
    expect(svg).toContain("Embedded video of the live app");
  });

  it("never produces an empty or summary-only snapshot", () => {
    const svg = renderSnapshotSvg({ width: 300, height: 150, title: "unknown" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("unknown");
    expect(svg.length).toBeGreaterThan(100);
  });

  it("escapes XML in user text", () => {
    const svg = renderSnapshotSvg({ width: 300, height: 150, title: "a<b>", text: "x & y" });
    expect(svg).toContain("a&lt;b&gt;");
    expect(svg).toContain("x &amp; y");
  });
});

import { describe, expect, it } from "vitest";
import { FIDELITY_POLICY } from "../src/export/fidelity/fidelity-policy";
import { countRepresentation, planBlockRepresentation, type PlannerInput } from "../src/export/fidelity/representation-planner";
import type { FidelityBlockReport, PptxFidelityPolicy } from "../src/export/fidelity/fidelity-types";

function rep(input: Partial<PlannerInput>): FidelityBlockReport {
  return planBlockRepresentation(
    {
      blockId: "b1",
      hidden: false,
      status: "native",
      issues: [],
      ...input,
    },
    FIDELITY_POLICY,
  );
}

describe("planBlockRepresentation", () => {
  it("maps native blocks to native representation", () => {
    const r = rep({ status: "native" });
    expect(r.representation).toBe("native");
    expect(r.editable).toBe(true);
    expect(r.contentPreserved).toBe(true);
  });

  it("maps svg elements to svg representation", () => {
    const r = rep({ status: "rasterized", element: { type: "svg", x: 0, y: 0, w: 100, h: 100, data: { svg: "<svg/>", alt: "A chart" } } });
    expect(r.representation).toBe("svg");
    expect(r.editable).toBe(false);
  });

  it("maps rasterized non-svg elements to raster", () => {
    const r = rep({ status: "rasterized" });
    expect(r.representation).toBe("raster");
  });

  it("maps substituted blocks to expanded-build", () => {
    const r = rep({ status: "substituted" });
    expect(r.representation).toBe("expanded-build");
  });

  it("is unsupported when the exporter errored", () => {
    const r = rep({ status: "native", issues: [{ code: "block-export-failed", severity: "error", message: "boom", automaticFixAvailable: false }] });
    expect(r.representation).toBe("unsupported");
    expect(r.contentPreserved).toBe(false);
    expect(r.editable).toBe(false);
  });

  it("skips hidden blocks without counting them as missing", () => {
    const r = rep({ hidden: true });
    expect(r.representation).toBe("unsupported");
    expect(r.status).toBe("skipped");
  });

  it("counts representations per category", () => {
    const blocks = [rep({ status: "native" }), rep({ status: "rasterized", element: { type: "svg", x: 0, y: 0, w: 1, h: 1, data: { svg: "" } } }), rep({ hidden: true })];
    expect(countRepresentation(blocks, "svg")).toBe(1);
    expect(countRepresentation(blocks, "native")).toBe(1);
  });

  it("respects a custom policy's allowed representations", () => {
    const custom: PptxFidelityPolicy = { ...FIDELITY_POLICY, representations: ["native"] };
    const r = planBlockRepresentation({ blockId: "b", hidden: false, status: "native", issues: [] }, custom);
    expect(r.representation).toBe("native");
  });
});

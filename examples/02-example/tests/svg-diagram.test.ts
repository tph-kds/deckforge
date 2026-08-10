import { describe, expect, it } from "vitest";
import { normalizeDiagram, renderDiagramSvg } from "../src/export/fidelity/svg/svg-diagram";

const DIAGRAM = {
  nodes: ["Agents", "Tools", "Guardrails"],
  edges: ["Agents->Tools", "Agents->Guardrails"],
};

describe("svg-diagram", () => {
  it("normalizes legacy string nodes and A->B edges", () => {
    const { nodes, edges } = normalizeDiagram(DIAGRAM);
    expect(nodes).toEqual([
      { id: "Agents", label: "Agents" },
      { id: "Tools", label: "Tools" },
      { id: "Guardrails", label: "Guardrails" },
    ]);
    expect(edges).toEqual([
      { from: "Agents", to: "Tools" },
      { from: "Agents", to: "Guardrails" },
    ]);
  });

  it("normalizes object nodes and edges", () => {
    const { nodes, edges } = normalizeDiagram({
      nodes: [{ id: "n1", label: "A" }, { id: "n2", label: "B" }],
      edges: [{ from: "n1", to: "n2" }],
    });
    expect(nodes[0]).toEqual({ id: "n1", label: "A" });
    expect(edges).toEqual([{ from: "n1", to: "n2" }]);
  });

  it("renders an SVG that preserves every node and edge label (never a summary)", () => {
    const svg = renderDiagramSvg(DIAGRAM, { width: 600, height: 400 });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Agents");
    expect(svg).toContain("Tools");
    expect(svg).toContain("Guardrails");
    expect(svg).toContain("<line");
    expect(svg).toContain("marker-end");
    expect(svg).not.toContain("nodes,");
    expect(svg).not.toContain("edges");
  });

  it("is deterministic for identical input", () => {
    const a = renderDiagramSvg(DIAGRAM, { width: 600, height: 400 });
    const b = renderDiagramSvg(DIAGRAM, { width: 600, height: 400 });
    expect(a).toBe(b);
  });

  it("respects theme colors when provided", () => {
    const svg = renderDiagramSvg(DIAGRAM, {
      width: 600,
      height: 400,
      colors: { nodeStroke: "112233", nodeFill: "EEEEEE", labelColor: "111111" },
    });
    expect(svg).toContain("112233");
    expect(svg).toContain("EEEEEE");
  });
});

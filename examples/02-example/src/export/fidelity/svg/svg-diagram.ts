export interface DiagramNodeInput {
  id?: string;
  label: string;
}

export interface DiagramEdgeInput {
  from: string;
  to: string;
}

export interface DiagramInput {
  nodes: Array<string | DiagramNodeInput>;
  edges?: Array<string | DiagramEdgeInput>;
}

export interface DiagramSvgOptions {
  width: number;
  height: number;
  colors?: {
    background?: string;
    nodeFill?: string;
    nodeStroke?: string;
    labelColor?: string;
    edgeColor?: string;
  };
}

const PAD = 16;
const NODE_W = 140;
const NODE_H = 48;

export function normalizeDiagram(input: DiagramInput): {
  nodes: DiagramNodeInput[];
  edges: DiagramEdgeInput[];
} {
  const nodes: DiagramNodeInput[] = (input.nodes ?? []).map((n) =>
    typeof n === "string" ? { id: n, label: n } : { id: n.id ?? n.label, label: n.label }
  );
  const edges: DiagramEdgeInput[] = (input.edges ?? []).map((e) =>
    typeof e === "string"
      ? (() => {
          const [from, to] = e.split("->");
          return { from: (from ?? "").trim(), to: (to ?? "").trim() };
        })()
      : { from: e.from, to: e.to }
  );
  return { nodes, edges };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function computeLayers(
  nodes: DiagramNodeInput[],
  edges: DiagramEdgeInput[]
): string[][] {
  const ids = new Set(nodes.map((n) => n.id ?? n.label));
  const incoming = new Map<string, Set<string>>(nodes.map((n) => [n.id!, new Set()]));
  for (const edge of edges) {
    if (ids.has(edge.from) && ids.has(edge.to) && edge.to !== edge.from) {
      incoming.get(edge.to)!.add(edge.from);
    }
  }
  const layers: string[][] = [];
  const placed = new Set<string>();
  const remaining = new Set<string>(ids);
  while (remaining.size > 0) {
    const layer = [...remaining]
      .filter((id) => [...incoming.get(id)!].every((p) => placed.has(p)))
      .sort();
    if (layer.length === 0) {
      layers.push([...remaining].sort());
      break;
    }
    layers.push(layer);
    layer.forEach((id) => {
      placed.add(id);
      remaining.delete(id);
    });
  }
  return layers;
}

export function renderDiagramSvg(input: DiagramInput, options: DiagramSvgOptions): string {
  const { nodes, edges } = normalizeDiagram(input);
  const { width, height } = options;
  const colors = options.colors ?? {};
  const bg = colors.background ?? "#FFFFFF";
  const nodeFill = colors.nodeFill ?? "#EEF2FF";
  const nodeStroke = colors.nodeStroke ?? "#6366F1";
  const labelColor = colors.labelColor ?? "#111827";
  const edgeColor = colors.edgeColor ?? "#9CA3AF";

  const layers = computeLayers(nodes, edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const layerCount = layers.length;

  const colX = (layerIdx: number): number => {
    if (layerCount <= 1) return width / 2 - NODE_W / 2;
    return PAD + (layerIdx * (width - 2 * PAD - NODE_W)) / (layerCount - 1);
  };
  const rowY = (rows: number, rowIdx: number): number => {
    if (rows <= 1) return height / 2 - NODE_H / 2;
    return PAD + (rowIdx * (height - 2 * PAD - NODE_H)) / (rows - 1);
  };

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, li) => {
    layer.forEach((id, ri) => {
      positions.set(id, { x: colX(li), y: rowY(layer.length, ri) });
    });
  });

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${bg}"/>`);
  parts.push(
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${edgeColor}"/></marker></defs>`
  );

  for (const edge of edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const x1 = from.x + NODE_W / 2;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edgeColor}" stroke-width="2" marker-end="url(#arrow)"/>`
    );
  }

  for (const node of nodes) {
    const key = node.id ?? node.label;
    const pos = positions.get(key);
    if (!pos || !nodeById.has(key)) continue;
    parts.push(
      `<rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}" rx="8" fill="${nodeFill}" stroke="${nodeStroke}" stroke-width="2"/>`
    );
    parts.push(
      `<text x="${pos.x + NODE_W / 2}" y="${pos.y + NODE_H / 2}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="13" fill="${labelColor}">${escapeXml(node.label)}</text>`
    );
  }

  parts.push("</svg>");
  return parts.join("\n");
}

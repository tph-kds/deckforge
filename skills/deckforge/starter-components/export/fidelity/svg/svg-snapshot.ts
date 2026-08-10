export interface SnapshotSvgOptions {
  width: number;
  height: number;
  title?: string;
  text?: string;
  alt?: string;
  colors?: {
    background?: string;
    border?: string;
    titleColor?: string;
    bodyColor?: string;
    mutedColor?: string;
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

export function renderSnapshotSvg(options: SnapshotSvgOptions): string {
  const { width, height } = options;
  const colors = options.colors ?? {};
  const bg = colors.background ?? "#FFFBF0";
  const border = colors.border ?? "#F59E0B";
  const bodyColor = colors.bodyColor ?? "#78350F";
  const mutedColor = colors.mutedColor ?? "#A16207";

  const headerH = Math.max(18, Math.min(28, Math.floor(height * 0.18)));
  const bodyTop = headerH + 8;
  const maxChars = Math.max(8, Math.floor((width - 24) / 8));
  const maxLines = Math.max(1, Math.floor((height - bodyTop - 20) / 18));
  const lines = wrapText(options.text ?? "", maxChars, maxLines);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${height}" rx="6" fill="${bg}" stroke="${border}" stroke-width="2"/>`
  );
  parts.push(`<rect x="0" y="0" width="${width}" height="${headerH}" fill="${border}"/>`);
  parts.push(
    `<text x="10" y="${headerH / 2}" dominant-baseline="central" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF">${escapeXml(options.title ?? "Content")}</text>`
  );
  lines.forEach((line, i) => {
    parts.push(
      `<text x="12" y="${bodyTop + i * 18}" font-family="Arial, sans-serif" font-size="13" fill="${bodyColor}">${escapeXml(line)}</text>`
    );
  });
  if (options.alt) {
    parts.push(
      `<text x="12" y="${height - 8}" font-family="Arial, sans-serif" font-size="10" fill="${mutedColor}">${escapeXml(options.alt)}</text>`
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
}

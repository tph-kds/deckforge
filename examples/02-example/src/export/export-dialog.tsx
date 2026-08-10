import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ExportPreflightResult,
  ExportReport,
  PptxExportConfig,
} from "./export-types";
import { DEFAULT_PPTX_CONFIG } from "./export-types";
import { runExportPreflight } from "./export-preflight";
import type { DeckProject } from "../deck/types";

interface ExportDialogProps {
  deck: DeckProject;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (result: Blob) => void;
  onError?: (error: Error) => void;
}

function fidelitySummary(report: ExportReport): string {
  const fallbacks = report.slides.reduce(
    (total, slide) =>
      total +
      slide.blocks.filter((b) => b.representation === "svg" || b.representation === "raster").length,
    0,
  );
  const native = report.slides.reduce(
    (total, slide) => total + slide.blocks.filter((b) => b.representation === "native").length,
    0,
  );
  const missing = report.slides.reduce(
    (total, slide) =>
      total + slide.blocks.filter((b) => !b.contentPreserved && b.status !== "skipped").length,
    0,
  );
  return `Native ${native} · Fallbacks ${fallbacks} · Missing ${missing}`;
}

export function ExportDialog({ deck, isOpen, onClose, onExport, onError }: ExportDialogProps) {
  const [config, setConfig] = useState<PptxExportConfig>(DEFAULT_PPTX_CONFIG);
  const [preflight, setPreflight] = useState<ExportPreflightResult | null>(null);
  const [lastReport, setLastReport] = useState<ExportReport | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const runPreflight = useCallback(async () => {
    if (!deck) return;
    const result = await runExportPreflight(deck, config);
    setPreflight(result);
  }, [deck, config]);

  useEffect(() => {
    if (isOpen) {
      runPreflight();
      closeButtonRef.current?.focus();
    }
  }, [isOpen, runPreflight]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleExport = async () => {
    if (!deck) return;
    setIsExporting(true);
    try {
      const { PptxExporter } = await import("./pptx/pptx-exporter");
      const exporter = new PptxExporter(config);
      const result = await exporter.export(deck);
      setLastReport(result.report);

      if (result.report.status === "failed") {
        onError?.(
          new Error(
            "Export failed: content could not be fully preserved. Fix the missing content before downloading.",
          ),
        );
        return;
      }

      onExport?.(result.blob);

      const deckData = deck as { meta?: { title?: string } };
      const title = deckData.meta?.title ?? "deck";
      const date = new Date().toISOString().split("T")[0];
      const filename = config.filenameTemplate
        .replace("{title}", title)
        .replace("{date}", date);

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const scoreColor =
    (preflight?.score ?? 0) >= 80
      ? "var(--theme-secondary, #10b981)"
      : (preflight?.score ?? 0) >= 50
        ? "#f59e0b"
        : "var(--ui-danger, #dc2626)";

  const reportColor =
    lastReport?.status === "complete"
      ? "var(--theme-secondary, #10b981)"
      : lastReport?.status === "partial"
        ? "#f59e0b"
        : "var(--ui-danger, #dc2626)";

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dialog" ref={dialogRef} style={{ maxWidth: 480 }}>
        <div className="dialog-header">
          <h2 id="export-dialog-title">Export</h2>
          <button
            ref={closeButtonRef}
            className="icon-button"
            onClick={onClose}
            aria-label="Close export dialog"
          >
            &times;
          </button>
        </div>

        <div style={{ padding: "16px 18px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--ui-fg)", marginBottom: 12 }}>
            Format
            <select
              value={config.mode}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as PptxExportConfig["mode"] })}
            >
              <option value="fidelity-first">PPTX (Fidelity First)</option>
              <option value="editability-first">PPTX (Editability First)</option>
            </select>
          </label>

          {preflight && (
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: "12px 14px",
                borderRadius: "var(--ui-radius)",
                border: `1px solid ${scoreColor}22`,
                backgroundColor: `${scoreColor}08`,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-fg)" }}>
                  {(preflight.score ?? 0) >= 80 ? "Ready to export" : (preflight.score ?? 0) >= 50 ? "Export with warnings" : "Issues detected"}
                </span>
                <span style={{ fontFamily: "var(--font-code)", fontSize: 12, color: scoreColor, fontWeight: 600 }}>
                  {preflight.score}/100
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ui-muted)" }}>
                <span>Coverage {Math.round(preflight.blockCoverage * 100)}%</span>
                <span>Recall {Math.round((preflight.estimatedRecall ?? 1) * 100)}%</span>
                <span>{preflight.estimatedFallbacks ?? 0} fallbacks</span>
                <span>{(preflight.estimatedMissing ?? 0) > 0 ? `${preflight.estimatedMissing} missing` : "0 missing"}</span>
                <span>{preflight.issues.filter(i => i.severity === "warning").length} warnings</span>
                <span>{preflight.issues.filter(i => i.severity === "info").length} info</span>
              </div>
            </div>
          )}

          {lastReport && (
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: "12px 14px",
                borderRadius: "var(--ui-radius)",
                border: `1px solid ${reportColor}33`,
                backgroundColor: `${reportColor}0A`,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-fg)" }}>
                  Export {lastReport.status}
                </span>
                <span style={{ fontFamily: "var(--font-code)", fontSize: 12, color: reportColor, fontWeight: 600, textTransform: "uppercase" }}>
                  {lastReport.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ui-muted)", marginBottom: 4 }}>
                {fidelitySummary(lastReport)}
              </div>
              {lastReport.status === "failed" && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--ui-danger, #dc2626)", fontWeight: 600 }}>
                  Export blocked: content was not fully preserved. Review the missing blocks below.
                </div>
              )}
              {lastReport.issues.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--ui-muted)", maxHeight: 120, overflowY: "auto" }}>
                  {lastReport.issues.slice(0, 8).map((issue, idx) => (
                    <div key={idx} style={{ marginBottom: 3 }}>
                      <span style={{ color: issue.severity === "error" ? "var(--ui-danger)" : issue.severity === "warning" ? "#b45309" : "var(--ui-muted)", fontWeight: 600 }}>
                        {issue.severity}
                      </span>{" "}
                      {issue.message}
                    </div>
                  ))}
                  {lastReport.issues.length > 8 && (
                    <div style={{ marginTop: 4 }}>… {lastReport.issues.length - 8} more issue(s)</div>
                  )}
                </div>
              )}
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ui-fg)", marginBottom: 16, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.includeSpeakerNotes}
              onChange={(e) => setConfig({ ...config, includeSpeakerNotes: e.target.checked })}
            />
            Include speaker notes
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="text-button"
              onClick={() => setShowDetails(!showDetails)}
              aria-expanded={showDetails}
              style={{ fontSize: 12 }}
            >
              {showDetails ? "Hide details" : "View details"}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--ui-radius)",
                border: "1px solid var(--ui-border)",
                background: "var(--ui-bg)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || (preflight?.score ?? 0) < 20 || lastReport?.status === "failed"}
              aria-busy={isExporting}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--ui-radius)",
                border: "none",
                background: "var(--ui-fg)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: isExporting ? "not-allowed" : "pointer",
                opacity: isExporting || (preflight?.score ?? 0) < 20 ? 0.5 : 1,
              }}
            >
              {isExporting ? "Exporting..." : "Export PPTX"}
            </button>
          </div>
        </div>

        {showDetails && preflight && (
          <div style={{ borderTop: "1px solid var(--ui-border)", padding: "14px 18px" }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ui-muted)", margin: "0 0 10px" }}>
              Preflight Issues
            </h3>
            {preflight.issues.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ui-muted)", margin: 0 }}>No issues found</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {preflight.issues.map((issue: { severity: string; message: string; suggestedFix?: string }, idx: number) => (
                  <li
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      marginBottom: 4,
                      borderRadius: "var(--ui-radius)",
                      backgroundColor: issue.severity === "error" ? "#fef2f2" : issue.severity === "warning" ? "#fffbeb" : "var(--ui-surface)",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: issue.severity === "error" ? "var(--ui-danger)" : issue.severity === "warning" ? "#b45309" : "var(--ui-muted)" }}>
                      {issue.severity}
                    </span>{" "}
                    {issue.message}
                    {issue.suggestedFix && (
                      <div style={{ marginTop: 3, color: "var(--ui-muted)", fontSize: 11 }}>
                        {issue.suggestedFix}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

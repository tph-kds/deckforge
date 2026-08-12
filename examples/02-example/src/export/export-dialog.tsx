import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ExportPreflightResult,
  ExportReport,
  PptxExportConfig,
  PreflightGroupSummary,
} from "./export-types";
import { DEFAULT_PPTX_CONFIG } from "./export-types";
import { runExportPreflight } from "./export-preflight";
import { prepareExport, type PreparedExport } from "./prepare-export";
import type { DeckProject, SaveState } from "../deck/types";
import { makeDeckSelfContained } from "./self-contained";
import { canonicalAssetRef } from "../deck/assets";
import type { Command, DispatchResult } from "../deck/commands";

interface ExportDialogProps {
  deck: DeckProject;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (result: Blob) => void;
  onError?: (error: Error) => void;
  commit?: (command: Command) => DispatchResult | undefined;
  saveNow?: () => SaveState;
}

/**
 * Export dialog state machine (regression fix P2-003).
 *
 * The previous implementation kept a free-form `phase` alongside a heuristic
 * score, so the UI could show "Ready to export" (from a geometry-unaware
 * preflight) at the same time as "Export failed" (from the last real export),
 * and repeated "Export failed" text when both the status line and the report
 * box rendered. This version uses explicit, mutually exclusive states:
 *
 *   IDLE → PREFLIGHTING → READY ─┐
 *                │               ├─→ EXPORTING → SUCCESS
 *                ├→ BLOCKED      └──────────────┘
 *                └→ FAILED  ←──────────────────────┘
 *
 * READY is only reachable when preflight passes (no error issues and zero
 * missing geometry); a failed preflight lands in BLOCKED (the export button
 * is disabled), and a serialization failure lands in FAILED — the two are
 * distinct states so "Export blocked" never shows the "FAILED" badge and the
 * contradictory messages can never coexist.
 */
type ExportUiState = "idle" | "preflight" | "blocked" | "ready" | "exporting" | "success" | "failed";
type ExportStage = "building" | "writing";

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

function currentImageSource(deck: DeckProject, slideId: string, blockId: string): string {
  const slide = deck.slides.find((s) => s.id === slideId);
  const block = slide?.blocks.find((b) => b.id === blockId);
  if (!block) return "";
  return canonicalAssetRef(deck, block)?.src ?? "";
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function ExportDialog({ deck, isOpen, onClose, onExport, onError, commit, saveNow }: ExportDialogProps) {
  const [config, setConfig] = useState<PptxExportConfig>(DEFAULT_PPTX_CONFIG);
  const [preflight, setPreflight] = useState<ExportPreflightResult | null>(null);
  const [lastReport, setLastReport] = useState<ExportReport | null>(null);
  const [state, setState] = useState<ExportUiState>("idle");
  const [stage, setStage] = useState<ExportStage>("building");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [fixDrafts, setFixDrafts] = useState<Record<string, string>>({});
  const [selfContaining, setSelfContaining] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  /**
   * The single prepared export for the current deck+config. Preflight and the
   * PPTX exporter MUST consume the SAME prepared result so "Ready to export"
   * can never diverge from what the exporter will actually produce. Recreated
   * whenever the deck or config changes.
   */
  const preparedRef = useRef<PreparedExport | null>(null);

  const runPreflight = useCallback(async () => {
    if (!deck) return;
    setState("preflight");
    setErrorMessage("");
    try {
      const prepared = await prepareExport(deck, config);
      preparedRef.current = prepared;
      const result = await runExportPreflight(prepared);
      setPreflight(result);
      setState(result.ready ? "ready" : "blocked");
      if (!result.ready) {
        const errors = result.issues.filter((issue) => issue.severity === "error");
        setErrorMessage(
          errors.length > 0
            ? `Preflight found ${errors.length} issue(s) that block a lossless export. Resolve them before exporting.`
            : "Preflight found content that cannot be preserved. Resolve it before exporting.",
        );
      }
    } catch (error) {
      setState("failed");
      setErrorMessage(
        `Preflight analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [deck, config]);

  const applyImageFix = (issue: { slideId?: string; blockId?: string }) => {
    if (!issue.slideId || !issue.blockId || !commit) return;
    const src = (fixDrafts[issue.blockId] ?? currentImageSource(deck, issue.slideId, issue.blockId)).trim();
    if (!src) return;
    commit({ type: "updateImageSource", slideId: issue.slideId, blockId: issue.blockId, src });
  };

  const chooseFileFix = async (issue: { slideId?: string; blockId?: string }) => {
    if (!issue.slideId || !issue.blockId || !commit) return;
    const input = document.getElementById(`fix-file-${issue.blockId}`) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const uri = await fileToDataUri(file);
    setFixDrafts((d) => ({ ...d, [issue.blockId!]: uri }));
    commit({ type: "updateImageSource", slideId: issue.slideId, blockId: issue.blockId, src: uri });
  };

  const handleSelfContained = async () => {
    if (!deck || !commit || selfContaining) return;
    setSelfContaining(true);
    setErrorMessage("");
    try {
      const result = await makeDeckSelfContained(deck);
      commit({ type: "replaceDeck", deck: result.deck });
      saveNow?.();
      if (result.failures.length > 0) {
        setErrorMessage(
          `${result.failures.length} image(s) could not be embedded offline. ` +
            "Resolve the remaining issues to export.",
        );
      }
    } catch (error) {
      setErrorMessage(
        `Could not make the deck self-contained: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setSelfContaining(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLastReport(null);
      setErrorMessage("");
      setProgress(0);
      setState("preflight");
      runPreflight();
      closeButtonRef.current?.focus();
    }
  }, [isOpen, runPreflight]);

  // Re-run preflight whenever the configuration changes so "Ready to export"
  // always reflects the actual config (e.g. speaker notes toggled on/off).
  useEffect(() => {
    if (isOpen && state !== "exporting") {
      runPreflight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state === "exporting") return;
        onClose();
        return;
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
  }, [isOpen, onClose, state]);

  const handleExport = async () => {
    if (!deck) return;
    setState("exporting");
    setStage("building");
    setErrorMessage("");
    setProgress(10);
    try {
      const { PptxExporter } = await import("./pptx/pptx-exporter");
      setProgress(30);
      const exporter = new PptxExporter(config);
      setStage("writing");
      setProgress(50);
      // Reuse the SAME prepared export that preflight consumed — the exporter
      // must never re-resolve assets or it could disagree with the READY
      // verdict (regression: preflight "Ready" + export "Failed to resolve").
      const prepared = preparedRef.current ?? (await prepareExport(deck, config));
      preparedRef.current = prepared;
      const result = await exporter.export(prepared);
      setProgress(90);
      setLastReport(result.report);

      if (result.report.status === "failed") {
        setState("failed");
        setErrorMessage(
          "Export failed: content could not be fully preserved. Fix the missing content before downloading.",
        );
        onError?.(new Error(errorMessage));
        return;
      }

      setProgress(100);
      setState("success");
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setState("failed");
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Export failed: ${message}`);
      onError?.(error as Error);
    }
  };

  if (!isOpen) return null;

  const isExporting = state === "exporting";
  const scoreColor =
    (preflight?.score ?? 0) >= 80
      ? "var(--theme-secondary, #10b981)"
      : (preflight?.score ?? 0) >= 50
        ? "#f59e0b"
        : "var(--ui-danger, #dc2626)";

  const canExport = (state === "ready" || state === "success") && !isExporting;

  const FIXABLE_IMAGE_CODES = new Set(["unresolved-image", "image-load-failed", "unknown-asset"]);
  const fixableIssues =
    preflight?.issues.filter(
      (i) => FIXABLE_IMAGE_CODES.has(i.code) && Boolean(i.slideId) && Boolean(i.blockId),
    ) ?? [];

  const stageLabel: Record<ExportStage, string> = {
    building: "Building slides...",
    writing: "Writing PPTX...",
  };

  const renderIssues = (issues: Array<{ severity: string; message: string; suggestedFix?: string }>) => (
    <div style={{ fontSize: 12, color: "var(--ui-muted)", maxHeight: 140, overflowY: "auto" }}>
      {issues.slice(0, 8).map((issue, idx) => (
        <div key={idx} style={{ marginBottom: 3 }}>
          <span style={{ color: issue.severity === "error" ? "var(--ui-danger)" : issue.severity === "warning" ? "#b45309" : "var(--ui-muted)", fontWeight: 600 }}>
            {issue.severity}
          </span>{" "}
          {issue.message}
        </div>
      ))}
      {issues.length > 8 && (
        <div style={{ marginTop: 4 }}>… {issues.length - 8} more issue(s)</div>
      )}
    </div>
  );

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget && !isExporting) onClose(); }}
    >
      <div className="dialog" ref={dialogRef} style={{ maxWidth: 480 }}>
        <div className="dialog-header">
          <h2 id="export-dialog-title">Export</h2>
          <button
            ref={closeButtonRef}
            className="icon-button"
            onClick={onClose}
            aria-label="Close export dialog"
            disabled={isExporting}
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
              disabled={isExporting}
            >
              <option value="fidelity-first">PPTX (Fidelity First)</option>
              <option value="editability-first">PPTX (Editability First)</option>
            </select>
          </label>

          {state === "preflight" && (
            <div role="status" aria-live="polite" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="spinner" aria-hidden="true" style={{
                  width: 14, height: 14, border: "2px solid var(--ui-border)",
                  borderTopColor: "var(--ui-fg)", borderRadius: "50%",
                  display: "inline-block", animation: "spin 0.7s linear infinite",
                }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-fg)" }}>
                  Analyzing deck...
                </span>
              </div>
            </div>
          )}

          {isExporting && (
            <div role="status" aria-live="polite" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="spinner" aria-hidden="true" style={{
                  width: 14, height: 14, border: "2px solid var(--ui-border)",
                  borderTopColor: "var(--ui-fg)", borderRadius: "50%",
                  display: "inline-block", animation: "spin 0.7s linear infinite",
                }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-fg)" }}>
                  {stageLabel[stage]}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--ui-border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`, borderRadius: 2,
                  background: "var(--ui-fg)", transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          )}

          {state === "ready" && preflight && (
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
                  Ready to export
                </span>
                <span style={{ fontFamily: "var(--font-code)", fontSize: 12, color: scoreColor, fontWeight: 600 }}>
                  {preflight.score}/100
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ui-muted)", flexWrap: "wrap" }}>
                <span>Coverage {Math.round(preflight.blockCoverage * 100)}%</span>
                <span>Recall {Math.round((preflight.estimatedRecall ?? 1) * 100)}%</span>
                <span>Native {preflight.coverage.native}</span>
                <span>Fallbacks {preflight.coverage.fallback}</span>
                <span>Missing {preflight.coverage.missing}</span>
                {preflight.coverage.satisfied && (
                  <span style={{ color: "var(--theme-secondary, #10b981)", fontWeight: 600 }}>
                    invariants OK
                  </span>
                )}
              </div>
            </div>
          )}

          {(state === "failed" || state === "blocked") && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                padding: "12px 14px",
                borderRadius: "var(--ui-radius)",
                border: `1px solid ${state === "failed" ? "var(--ui-danger, #dc2626)" : "var(--ui-danger, #dc2626)"}33`,
                backgroundColor: "var(--ui-danger, #dc2626)0A",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-danger, #dc2626)" }}>
                  {state === "failed" ? "Export failed" : "Export blocked"}
                </span>
                <span style={{ fontFamily: "var(--font-code)", fontSize: 12, color: "var(--ui-danger, #dc2626)", fontWeight: 600, textTransform: "uppercase" }}>
                  {state === "failed" ? "FAILED" : "BLOCKED"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ui-muted)", marginBottom: 4 }}>
                {errorMessage}
              </div>
            </div>
          )}

          {state === "blocked" && fixableIssues.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {fixableIssues.map((issue) => {
                const blockId = issue.blockId!;
                const value = fixDrafts[blockId] ?? currentImageSource(deck, issue.slideId!, blockId);
                return (
                  <div
                    key={`${issue.slideId}:${blockId}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      padding: "10px 12px",
                      borderRadius: "var(--ui-radius)",
                      border: "1px solid var(--ui-border)",
                      marginBottom: 8,
                      background: "var(--ui-surface)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ui-fg)" }}>
                      Fix image {blockId}
                    </div>
                    <input
                      type="text"
                      aria-label={`Image source for ${blockId}`}
                      value={value}
                      onChange={(e) => setFixDrafts((d) => ({ ...d, [blockId]: e.target.value }))}
                      disabled={isExporting}
                      placeholder="https://… or data:image/…"
                      style={{
                        padding: "6px 8px",
                        borderRadius: "var(--ui-radius)",
                        border: "1px solid var(--ui-border)",
                        background: "var(--ui-bg)",
                        fontSize: 12,
                        color: "var(--ui-fg)",
                      }}
                    />
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <label
                        htmlFor={`fix-file-${blockId}`}
                        style={{ fontSize: 12, cursor: "pointer", color: "var(--ui-fg)" }}
                      >
                        Choose file…
                      </label>
                      <input
                        id={`fix-file-${blockId}`}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={() => chooseFileFix(issue)}
                      />
                      <button
                        onClick={() => applyImageFix(issue)}
                        aria-label={`Apply image fix for ${blockId}`}
                        disabled={isExporting}
                        style={{
                          marginLeft: "auto",
                          padding: "5px 12px",
                          borderRadius: "var(--ui-radius)",
                          border: "none",
                          background: "var(--ui-fg)",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isExporting ? "not-allowed" : "pointer",
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {state === "success" && lastReport && (
            <div
              role="status"
              aria-live="polite"
              style={{
                padding: "12px 14px",
                borderRadius: "var(--ui-radius)",
                border: "1px solid var(--theme-secondary, #10b981)33",
                backgroundColor: "var(--theme-secondary, #10b981)0A",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "var(--theme-secondary, #10b981)", fontSize: 16 }} aria-hidden="true">&#10003;</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-fg)" }}>
                  Export complete!
                </span>
                <span style={{ fontFamily: "var(--font-code)", fontSize: 12, color: "var(--theme-secondary, #10b981)", fontWeight: 600, textTransform: "uppercase", marginLeft: "auto" }}>
                  {lastReport.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ui-muted)", marginBottom: 4 }}>
                {fidelitySummary(lastReport)}
              </div>
            </div>
          )}

          {lastReport && lastReport.issues.length > 0 && state !== "exporting" && (
            <div style={{ fontSize: 12, color: "var(--ui-muted)", marginBottom: 14 }}>
              {renderIssues(lastReport.issues)}
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ui-fg)", marginBottom: 16, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.includeSpeakerNotes}
              onChange={(e) => setConfig({ ...config, includeSpeakerNotes: e.target.checked })}
              disabled={isExporting}
            />
            Include speaker notes
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="text-button"
              onClick={handleSelfContained}
              disabled={isExporting || selfContaining}
              style={{ fontSize: 12, marginRight: "auto" }}
            >
              {selfContaining ? "Embedding images…" : "Make deck self-contained"}
            </button>
            <button
              className="text-button"
              onClick={() => setShowDetails(!showDetails)}
              aria-expanded={showDetails}
              style={{ fontSize: 12 }}
              disabled={isExporting || !preflight}
            >
              {showDetails ? "Hide details" : "View details"}
            </button>
            <button
              onClick={onClose}
              disabled={isExporting}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--ui-radius)",
                border: "1px solid var(--ui-border)",
                background: "var(--ui-bg)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {state === "success" ? "Close" : "Cancel"}
            </button>
            <button
              onClick={handleExport}
              disabled={!canExport}
              aria-busy={isExporting}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--ui-radius)",
                border: "none",
                background: canExport ? "var(--ui-fg)" : "var(--ui-border)",
                color: canExport ? "#fff" : "var(--ui-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: canExport ? "pointer" : "not-allowed",
              }}
            >
              {isExporting ? "Exporting..." : state === "success" ? "Export Again" : "Export PPTX"}
            </button>
          </div>
        </div>

        {showDetails && preflight && state !== "exporting" && (
          <div style={{ borderTop: "1px solid var(--ui-border)", padding: "14px 18px" }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ui-muted)", margin: "0 0 10px" }}>
              Preflight Issues
            </h3>
            {preflight.issues.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ui-muted)", margin: 0 }}>No issues found</p>
            ) : (
              preflight.groups.map((group: PreflightGroupSummary) => (
                <div key={group.group} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ui-muted)", margin: "0 0 6px" }}>
                    {group.label} <span style={{ fontWeight: 400 }}>({group.count})</span>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {group.issues.slice(0, 5).map((issue, idx) => (
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
                    {group.issues.length > 5 && (
                      <li style={{ fontSize: 11, color: "var(--ui-muted)", paddingLeft: 10 }}>
                        … {group.issues.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

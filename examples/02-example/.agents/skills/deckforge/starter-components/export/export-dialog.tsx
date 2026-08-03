// starter-components/export/export-dialog.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ExportPreflightResult, PptxExportConfig } from "./export-types";
import { DEFAULT_PPTX_CONFIG } from "./export-types";
import { runExportPreflight } from "./export-preflight";

interface ExportDialogProps {
  deck: unknown;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (result: Blob) => void;
  onError?: (error: Error) => void;
}

export function ExportDialog({ deck, isOpen, onClose, onExport, onError }: ExportDialogProps) {
  const [config, setConfig] = useState<PptxExportConfig>(DEFAULT_PPTX_CONFIG);
  const [preflight, setPreflight] = useState<ExportPreflightResult | null>(null);
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
      const blob = await exporter.export(deck);
      onExport?.(blob);

      const deckData = deck as { meta?: { title?: string } };
      const title = deckData.meta?.title ?? "deck";
      const date = new Date().toISOString().split("T")[0];
      const filename = config.filenameTemplate
        .replace("{title}", title)
        .replace("{date}", date);

      const url = URL.createObjectURL(blob);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 id="export-dialog-title" style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Export Center</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close export dialog"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "4px 8px" }}
          >
            &times;
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="export-format" style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>Format</label>
          <select
            id="export-format"
            value={config.mode}
            onChange={(e) => setConfig({ ...config, mode: e.target.value as PptxExportConfig["mode"] })}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="hybrid">PPTX (Hybrid)</option>
          </select>
        </div>

        {preflight && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: "12px",
              borderRadius: "6px",
              backgroundColor: preflight.score >= 80 ? "#f0fdf4" : preflight.score >= 50 ? "#fffbeb" : "#fef2f2",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>
              {preflight.score >= 80 ? "Export ready" : preflight.score >= 50 ? "Export with warnings" : "Export issues detected"}
            </div>
            <div style={{ fontSize: "14px" }}>
              Fidelity score: {preflight.score}/100 | Coverage: {Math.round(preflight.blockCoverage * 100)}%
            </div>
            <div style={{ fontSize: "14px", marginTop: "4px" }}>
              {preflight.issues.filter(i => i.severity === "warning").length} warnings, {preflight.issues.filter(i => i.severity === "info").length} info
            </div>
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
            <input
              type="checkbox"
              checked={config.includeSpeakerNotes}
              onChange={(e) => setConfig({ ...config, includeSpeakerNotes: e.target.checked })}
            />
            Include speaker notes
          </label>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            {showDetails ? "Hide Details" : "View Details"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || (preflight?.score ?? 0) < 20}
            aria-busy={isExporting}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#1A73E8",
              color: "white",
              cursor: isExporting ? "not-allowed" : "pointer",
              opacity: isExporting || (preflight?.score ?? 0) < 20 ? 0.5 : 1,
            }}
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>

        {showDetails && preflight && (
          <div style={{ marginTop: "16px", borderTop: "1px solid #eee", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Preflight Issues</h3>
            {preflight.issues.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#666" }}>No issues found</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {preflight.issues.map((issue, idx) => (
                  <li key={idx} style={{
                    padding: "8px",
                    marginBottom: "4px",
                    borderRadius: "4px",
                    backgroundColor: issue.severity === "error" ? "#fef2f2" : issue.severity === "warning" ? "#fffbeb" : "#f0f9ff",
                    fontSize: "13px",
                  }}>
                    <span style={{ fontWeight: 500 }}>[{issue.severity}]</span> {issue.message}
                    {issue.suggestedFix && (
                      <div style={{ marginTop: "4px", color: "#666" }}>Fix: {issue.suggestedFix}</div>
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
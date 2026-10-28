import React, { useState } from "react";
import { useQueueStore } from "../../stores/queueStore";
import {
  RotateCw,
  FileText,
  FilePlus,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import {
  rotatePdf,
  mergePdfs,
  splitPdf,
  extractPdfPages,
  convertImagesToPdf,
  revealInFileManager,
} from "../../lib/tauriBridge";

export const PdfSettingsPanel: React.FC = () => {
  const { items, selectedItemIds, updateItemStatus } = useQueueStore();
  const [activeTab, setActiveTab] = useState<"rotate" | "merge" | "split" | "images_to_pdf">("rotate");
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [pageRange, setPageRange] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ path: string; duration: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected or all PDF items
  const selectedItems = items.filter((i) => selectedItemIds.includes(i.id));
  const pdfItems = items.filter((i) => i.file.detectedFormat === "pdf");
  const imageItems = items.filter((i) =>
    ["png", "jpeg", "webp", "bmp", "ico"].includes(i.file.detectedFormat)
  );

  const targetPdf = (selectedItems.find((i) => i.file.detectedFormat === "pdf") || pdfItems[0])?.file;

  const parsePageNumbers = (input: string): number[] => {
    if (!input.trim()) return [];
    const pages: number[] = [];
    const parts = input.split(",").map((s) => s.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.push(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          pages.push(num);
        }
      }
    }
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  };

  const handleRotate = async () => {
    if (!targetPdf) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setLastResult(null);

    const pages = pageRange.trim() ? parsePageNumbers(pageRange) : undefined;
    try {
      const result = await rotatePdf({
        inputPath: targetPdf.path,
        angle: rotationAngle,
        pages,
      });

      if (result.success) {
        setLastResult({ path: result.outputPath, duration: result.durationMs });
        const targetQueueItem = items.find((i) => i.file.path === targetPdf.path);
        if (targetQueueItem) {
          updateItemStatus(targetQueueItem.id, "completed", 100, result.outputPath);
        }
      } else {
        setErrorMessage(result.errorMessage || "Rotation failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Native PDF engine error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    const candidates = selectedItems.length >= 2 ? selectedItems : pdfItems;
    if (candidates.length < 2) {
      setErrorMessage("At least 2 PDF documents must be present in queue for merging.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setLastResult(null);

    try {
      const result = await mergePdfs({
        inputPaths: candidates.map((i) => i.file.path),
      });

      if (result.success) {
        setLastResult({ path: result.outputPath, duration: result.durationMs });
        for (const item of candidates) {
          updateItemStatus(item.id, "completed", 100, result.outputPath);
        }
      } else {
        setErrorMessage(result.errorMessage || "Merge operation failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Native merge error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!targetPdf) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setLastResult(null);

    try {
      if (pageRange.trim()) {
        const pages = parsePageNumbers(pageRange);
        const result = await extractPdfPages({
          inputPath: targetPdf.path,
          pages,
        });

        if (result.success) {
          setLastResult({ path: result.outputPath, duration: result.durationMs });
          const targetQueueItem = items.find((i) => i.file.path === targetPdf.path);
          if (targetQueueItem) {
            updateItemStatus(targetQueueItem.id, "completed", 100, result.outputPath);
          }
        } else {
          setErrorMessage(result.errorMessage || "Extraction failed");
        }
      } else {
        const files = await splitPdf({
          inputPath: targetPdf.path,
        });

        if (files.length > 0) {
          setLastResult({ path: files[0], duration: 50 });
          const targetQueueItem = items.find((i) => i.file.path === targetPdf.path);
          if (targetQueueItem) {
            updateItemStatus(targetQueueItem.id, "completed", 100, files[0]);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Split operation error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImagesToPdf = async () => {
    const candidates = selectedItems.length > 0 ? selectedItems.filter((i) => imageItems.some((img) => img.id === i.id)) : imageItems;
    if (candidates.length === 0) {
      setErrorMessage("No image files selected to convert into PDF.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setLastResult(null);

    try {
      const result = await convertImagesToPdf({
        inputPaths: candidates.map((i) => i.file.path),
      });

      if (result.success) {
        setLastResult({ path: result.outputPath, duration: result.durationMs });
        for (const item of candidates) {
          updateItemStatus(item.id, "completed", 100, result.outputPath);
        }
      } else {
        setErrorMessage(result.errorMessage || "Image to PDF compilation failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Native engine error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-relay-surface border-l border-relay-border w-80 p-4 flex flex-col font-mono text-xs select-none overflow-y-auto">
      <div className="flex items-center space-x-2 pb-3 border-b border-relay-border mb-4">
        <FileText className="w-4 h-4 text-relay-primary" />
        <span className="font-bold text-relay-text uppercase tracking-wider text-[11px]">
          PDF Toolkit
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-relay-bg border border-relay-border rounded-xs mb-4 text-[10px]">
        <button
          onClick={() => setActiveTab("rotate")}
          className={`py-1 text-center font-bold uppercase rounded-xs transition-colors ${
            activeTab === "rotate"
              ? "bg-relay-surface text-relay-primary border border-relay-border"
              : "text-relay-faint hover:text-relay-muted"
          }`}
        >
          Rotate
        </button>
        <button
          onClick={() => setActiveTab("merge")}
          className={`py-1 text-center font-bold uppercase rounded-xs transition-colors ${
            activeTab === "merge"
              ? "bg-relay-surface text-relay-primary border border-relay-border"
              : "text-relay-faint hover:text-relay-muted"
          }`}
        >
          Merge
        </button>
        <button
          onClick={() => setActiveTab("split")}
          className={`py-1 text-center font-bold uppercase rounded-xs transition-colors ${
            activeTab === "split"
              ? "bg-relay-surface text-relay-primary border border-relay-border"
              : "text-relay-faint hover:text-relay-muted"
          }`}
        >
          Split
        </button>
        <button
          onClick={() => setActiveTab("images_to_pdf")}
          className={`py-1 text-center font-bold uppercase rounded-xs transition-colors ${
            activeTab === "images_to_pdf"
              ? "bg-relay-surface text-relay-primary border border-relay-border"
              : "text-relay-faint hover:text-relay-muted"
          }`}
        >
          Img-PDF
        </button>
      </div>

      {/* Target File Info */}
      {activeTab !== "images_to_pdf" && (
        <div className="mb-4 p-2.5 bg-relay-bg border border-relay-border rounded-xs">
          <div className="text-[10px] text-relay-faint uppercase mb-1">Target Document</div>
          {targetPdf ? (
            <div className="truncate text-relay-text font-semibold" title={targetPdf.name}>
              {targetPdf.name}
            </div>
          ) : (
            <div className="text-relay-warning text-[11px]">No PDF document selected</div>
          )}
        </div>
      )}

      {/* ROTATE TAB */}
      {activeTab === "rotate" && (
        <div className="space-y-4">
          <div>
            <label className="text-relay-muted font-semibold block mb-2 text-[11px]">
              Rotation Angle
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([90, 180, 270] as const).map((angle) => (
                <button
                  key={angle}
                  type="button"
                  onClick={() => setRotationAngle(angle)}
                  className={`py-1.5 px-2 rounded-xs border text-center font-semibold transition-colors ${
                    rotationAngle === angle
                      ? "bg-relay-primary/10 border-relay-primary text-relay-primary"
                      : "bg-relay-bg border-relay-border text-relay-muted hover:border-relay-muted/50 hover:text-relay-text"
                  }`}
                >
                  +{angle}°
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-relay-muted font-semibold block mb-1 text-[11px]">
              Page Scope
            </label>
            <input
              type="text"
              placeholder="All pages (or e.g. 1, 3, 5-8)"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              className="w-full bg-relay-bg border border-relay-border rounded-xs px-2.5 py-1.5 text-relay-text outline-none focus:border-relay-primary text-xs"
            />
            <div className="text-[10px] text-relay-faint mt-1">
              Leave blank to apply rotation to all pages in the document.
            </div>
          </div>

          <button
            onClick={handleRotate}
            disabled={!targetPdf || isProcessing}
            className={`w-full py-2 px-3 rounded-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
              !targetPdf || isProcessing
                ? "bg-relay-border text-relay-faint cursor-not-allowed"
                : "bg-relay-primary hover:bg-relay-primary-hover text-white shadow-sm"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rotating...</span>
              </>
            ) : (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Apply Rotation</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* MERGE TAB */}
      {activeTab === "merge" && (
        <div className="space-y-4">
          <div className="p-2.5 bg-relay-bg border border-relay-border rounded-xs">
            <div className="text-[10px] text-relay-faint uppercase mb-1">Documents to Merge</div>
            <div className="text-relay-text font-bold text-sm">
              {selectedItems.length >= 2 ? selectedItems.length : pdfItems.length} documents
            </div>
            <div className="text-[10px] text-relay-faint mt-1">
              Will combine documents in queue order into a single unified PDF.
            </div>
          </div>

          <button
            onClick={handleMerge}
            disabled={pdfItems.length < 2 || isProcessing}
            className={`w-full py-2 px-3 rounded-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
              pdfItems.length < 2 || isProcessing
                ? "bg-relay-border text-relay-faint cursor-not-allowed"
                : "bg-relay-primary hover:bg-relay-primary-hover text-white shadow-sm"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Merging Documents...</span>
              </>
            ) : (
              <>
                <FilePlus className="w-3.5 h-3.5" />
                <span>Merge All PDFs</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* SPLIT TAB */}
      {activeTab === "split" && (
        <div className="space-y-4">
          <div>
            <label className="text-relay-muted font-semibold block mb-1 text-[11px]">
              Extract Pages
            </label>
            <input
              type="text"
              placeholder="e.g. 1-3, 5 (or blank to split all)"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              className="w-full bg-relay-bg border border-relay-border rounded-xs px-2.5 py-1.5 text-relay-text outline-none focus:border-relay-primary text-xs"
            />
            <div className="text-[10px] text-relay-faint mt-1">
              If left blank, creates individual single-page documents for every page.
            </div>
          </div>

          <button
            onClick={handleSplit}
            disabled={!targetPdf || isProcessing}
            className={`w-full py-2 px-3 rounded-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
              !targetPdf || isProcessing
                ? "bg-relay-border text-relay-faint cursor-not-allowed"
                : "bg-relay-primary hover:bg-relay-primary-hover text-white shadow-sm"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Splitting...</span>
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" />
                <span>Split Document</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* IMAGES TO PDF TAB */}
      {activeTab === "images_to_pdf" && (
        <div className="space-y-4">
          <div className="p-2.5 bg-relay-bg border border-relay-border rounded-xs">
            <div className="text-[10px] text-relay-faint uppercase mb-1">Images in Queue</div>
            <div className="text-relay-text font-bold text-sm">
              {imageItems.length} image files
            </div>
            <div className="text-[10px] text-relay-faint mt-1">
              Compresses and embeds images sequentially into a multi-page PDF document.
            </div>
          </div>

          <button
            onClick={handleImagesToPdf}
            disabled={imageItems.length === 0 || isProcessing}
            className={`w-full py-2 px-3 rounded-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
              imageItems.length === 0 || isProcessing
                ? "bg-relay-border text-relay-faint cursor-not-allowed"
                : "bg-relay-primary hover:bg-relay-primary-hover text-white shadow-sm"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>Compile to PDF</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Status / Output Result */}
      {lastResult && (
        <div className="mt-4 p-2.5 bg-relay-bg border border-relay-success/50 rounded-xs text-[11px] space-y-2">
          <div className="flex items-center space-x-1.5 text-relay-success font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Operation Verified ({lastResult.duration}ms)</span>
          </div>
          <div className="text-relay-faint truncate text-[10px]" title={lastResult.path}>
            {lastResult.path}
          </div>
          <button
            onClick={() => revealInFileManager(lastResult.path)}
            className="flex items-center space-x-1 text-relay-text hover:text-relay-primary underline text-[10px]"
          >
            <FolderOpen className="w-3 h-3" />
            <span>Open in File Explorer</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-2.5 bg-relay-bg border border-relay-error/50 rounded-xs text-[11px] text-relay-error flex items-start space-x-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Engine Info Box */}
      <div className="mt-auto pt-4">
        <div className="p-2.5 bg-relay-bg border border-relay-border rounded-xs">
          <div className="text-[10px] font-bold text-relay-muted uppercase mb-1">
            Active Engine
          </div>
          <div className="text-[11px] text-relay-faint leading-relaxed">
            Native Pure Rust PDF Engine (lopdf). Zero external command dependencies, local execution only, verified object integrity.
          </div>
        </div>
      </div>
    </div>
  );
};

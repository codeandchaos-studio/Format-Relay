import React, { useState } from "react";
import { useQueueStore } from "../../stores/queueStore";
import {
  Database,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import {
  convertCsvToJson,
  convertJsonToCsv,
  revealInFileManager,
} from "../../lib/tauriBridge";

export const DataSettingsPanel: React.FC = () => {
  const { items, selectedItemIds, updateItemStatus } = useQueueStore();
  const [delimiter, setDelimiter] = useState<"," | "\t" | ";" | "|">(",");
  const [prettyJson, setPrettyJson] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ path: string; duration: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected or all data items
  const selectedItems = items.filter((i) => selectedItemIds.includes(i.id));
  const dataItems = items.filter((i) => ["csv", "json"].includes(i.file.detectedFormat));
  const targetDataFile = (selectedItems.find((i) => ["csv", "json"].includes(i.file.detectedFormat)) || dataItems[0])?.file;

  const isCsv = targetDataFile?.detectedFormat === "csv";
  const targetFormatLabel = isCsv ? "JSON" : "CSV";

  const handleConvert = async () => {
    if (!targetDataFile) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setLastResult(null);

    try {
      let result;
      if (isCsv) {
        result = await convertCsvToJson({
          inputPath: targetDataFile.path,
          delimiter,
          pretty: prettyJson,
        });
      } else {
        result = await convertJsonToCsv({
          inputPath: targetDataFile.path,
          delimiter,
        });
      }

      if (result.success) {
        setLastResult({ path: result.outputPath, duration: result.durationMs });
        const targetQueueItem = items.find((i) => i.file.path === targetDataFile.path);
        if (targetQueueItem) {
          updateItemStatus(targetQueueItem.id, "completed", 100, result.outputPath);
        }
      } else {
        setErrorMessage(result.errorMessage || "Data conversion failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Native data engine invocation error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-relay-surface border-l border-relay-border w-80 p-4 flex flex-col font-mono text-xs select-none overflow-y-auto">
      <div className="flex items-center space-x-2 pb-3 border-b border-relay-border mb-4">
        <Database className="w-4 h-4 text-relay-primary" />
        <span className="font-bold text-relay-text uppercase tracking-wider text-[11px]">
          Structured Data Engine
        </span>
      </div>

      {/* Target File Info */}
      <div className="mb-4 p-2.5 bg-relay-bg border border-relay-border rounded-xs">
        <div className="text-[10px] text-relay-faint uppercase mb-1">Target Document</div>
        {targetDataFile ? (
          <div>
            <div className="truncate text-relay-text font-semibold mb-1" title={targetDataFile.name}>
              {targetDataFile.name}
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-relay-faint">
              <span className="uppercase px-1 py-0.5 bg-relay-surface border border-relay-border rounded-xs">
                {targetDataFile.detectedFormat}
              </span>
              <span>to</span>
              <span className="uppercase px-1 py-0.5 bg-relay-primary/20 text-relay-primary border border-relay-primary/40 rounded-xs font-bold">
                {targetFormatLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-relay-warning text-[11px]">No CSV or JSON file selected</div>
        )}
      </div>

      {/* Delimiter Selection */}
      <div className="mb-4">
        <label className="text-relay-muted font-semibold block mb-2 text-[11px]">
          Delimiter
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {([
            { label: "Comma (,)", val: "," },
            { label: "Tab (\\t)", val: "\t" },
            { label: "Semicolon (;)", val: ";" },
            { label: "Pipe (|)", val: "|" },
          ] as const).map(({ label, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => setDelimiter(val)}
              className={`py-1.5 px-1 rounded-xs border text-center font-semibold text-[10px] transition-colors ${
                delimiter === val
                  ? "bg-relay-primary/10 border-relay-primary text-relay-primary"
                  : "bg-relay-bg border-relay-border text-relay-muted hover:border-relay-muted/50 hover:text-relay-text"
              }`}
            >
              {label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Pretty JSON Option (if converting to JSON) */}
      {isCsv && (
        <div className="mb-5 p-2 bg-relay-bg border border-relay-border rounded-xs">
          <label className="flex items-center space-x-2 text-[11px] text-relay-muted cursor-pointer">
            <input
              type="checkbox"
              checked={prettyJson}
              onChange={(e) => setPrettyJson(e.target.checked)}
              className="accent-relay-primary rounded-xs"
            />
            <span className="font-semibold">Format Output (Pretty Indented)</span>
          </label>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleConvert}
        disabled={!targetDataFile || isProcessing}
        className={`w-full py-2 px-3 rounded-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
          !targetDataFile || isProcessing
            ? "bg-relay-border text-relay-faint cursor-not-allowed"
            : "bg-relay-primary hover:bg-relay-primary-hover text-white shadow-sm"
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Processing Data...</span>
          </>
        ) : (
          <>
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Convert to {targetFormatLabel}</span>
          </>
        )}
      </button>

      {/* Status / Output Result */}
      {lastResult && (
        <div className="mt-4 p-2.5 bg-relay-bg border border-relay-success/50 rounded-xs text-[11px] space-y-2">
          <div className="flex items-center space-x-1.5 text-relay-success font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Converted & Verified ({lastResult.duration}ms)</span>
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

      {/* Active Engine Box */}
      <div className="mt-auto pt-4">
        <div className="p-2.5 bg-relay-bg border border-relay-border rounded-xs">
          <div className="text-[10px] font-bold text-relay-muted uppercase mb-1">
            Active Engine
          </div>
          <div className="text-[11px] text-relay-faint leading-relaxed">
            Native Pure Rust Data Engine. RFC 4180 quotation escaping, automatic type inference (numbers, booleans, nulls), zero cloud dependencies.
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { useQueueStore } from "../../stores/queueStore";
import { FileQueueItem } from "./FileQueueItem";
import { FileDropZone } from "./FileDropZone";
import { Trash2, CheckSquare, Square, Play, RefreshCw } from "lucide-react";
import { convertImage, convertCsvToJson, convertJsonToCsv } from "../../lib/tauriBridge";
import { useHistoryStore } from "../../stores/historyStore";

export const FileQueueList: React.FC = () => {
  const {
    items,
    selectedItemIds,
    selectAll,
    clearSelection,
    clearQueue,
    removeItems,
    globalImageOptions,
    updateItemStatus,
    isProcessing,
    setIsProcessing,
  } = useQueueStore();

  const allSelected = items.length > 0 && selectedItemIds.length === items.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const handleStartProcessing = async () => {
    if (isProcessing || items.length === 0) return;

    setIsProcessing(true);
    const targetItems = items.filter((i) => i.status === "idle" || i.status === "failed");

    for (const item of targetItems) {
      updateItemStatus(item.id, "processing", 15);
      const startTime = Date.now();

      try {
        let result;
        const fmt = item.file.detectedFormat;

        if (["png", "jpeg", "webp", "bmp", "ico"].includes(fmt)) {
          result = await convertImage({
            inputPath: item.file.path,
            options: {
              ...globalImageOptions,
              targetFormat: (item.targetFormat as any) || globalImageOptions.targetFormat,
            },
          });
        } else if (fmt === "csv") {
          result = await convertCsvToJson({
            inputPath: item.file.path,
            pretty: true,
          });
        } else if (fmt === "json") {
          result = await convertJsonToCsv({
            inputPath: item.file.path,
          });
        } else {
          // Format has specific settings panel
          continue;
        }

        const duration = Date.now() - startTime;
        if (result && result.success) {
          updateItemStatus(item.id, "completed", 100, result.outputPath);
          
          const state = useQueueStore.getState();
          const target = state.items.find((i) => i.id === item.id);
          if (target) {
            target.durationMs = duration;
          }

          // Record in persistent history
          useHistoryStore.getState().addRecord({
            sourcePath: item.file.path,
            sourceFileName: item.file.name,
            sourceFormat: item.file.detectedFormat,
            targetFormat: item.targetFormat || (fmt === "csv" ? "json" : fmt === "json" ? "csv" : globalImageOptions.targetFormat),
            operationId: fmt === "csv" ? "data_csv_to_json" : fmt === "json" ? "data_json_to_csv" : "image_transcode",
            outputPath: result.outputPath,
            sizeBytesBefore: item.file.sizeBytes,
            sizeBytesAfter: result.bytesWritten,
            durationMs: duration,
            status: "success",
          });
        } else if (result) {
          updateItemStatus(item.id, "failed", 0, undefined, result.errorMessage || "Processing failed");
        }
      } catch (err: any) {
        updateItemStatus(item.id, "failed", 0, undefined, err.message || "Engine invocation error");
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-relay-bg">
      {items.length === 0 ? (
        <div className="p-6 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <FileDropZone />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 p-4">
          {/* Queue Action Toolbar */}
          <div className="flex items-center justify-between pb-3 border-b border-relay-border mb-3 font-mono text-xs select-none">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center space-x-1 text-relay-muted hover:text-relay-text"
              >
                {allSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-relay-primary" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>{selectedItemIds.length > 0 ? `${selectedItemIds.length} Selected` : "Select All"}</span>
              </button>

              {selectedItemIds.length > 0 && (
                <button
                  onClick={() => removeItems(selectedItemIds)}
                  className="flex items-center space-x-1 text-relay-faint hover:text-relay-error transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Selected</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={clearQueue}
                disabled={isProcessing}
                className="px-2.5 py-1 text-relay-faint hover:text-relay-text hover:bg-relay-surface border border-transparent hover:border-relay-border rounded-xs transition-colors"
              >
                Clear Queue
              </button>

              <button
                onClick={handleStartProcessing}
                disabled={isProcessing}
                className={`px-4 py-1.5 rounded-sm font-semibold flex items-center space-x-1.5 transition-colors ${
                  isProcessing
                    ? "bg-relay-border text-relay-faint cursor-not-allowed"
                    : "bg-relay-primary hover:bg-relay-primary-hover text-white shadow-sm"
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Convert All</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Queue Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {items.map((item) => (
              <FileQueueItem key={item.id} item={item} />
            ))}
          </div>

          {/* Bottom Drop Zone Mini */}
          <div className="pt-3">
            <FileDropZone />
          </div>
        </div>
      )}
    </div>
  );
};

import React from "react";
import { QueueItem } from "../../types/job";
import { useQueueStore } from "../../stores/queueStore";
import { revealInFileManager } from "../../lib/tauriBridge";
import { Trash2, CheckCircle2, AlertCircle, Loader2, ExternalLink, Image, FileText, Database, HelpCircle } from "lucide-react";

interface Props {
  item: QueueItem;
}

export const FileQueueItem: React.FC<Props> = ({ item }) => {
  const { selectedItemIds, selectItem, removeItems, setItemOperation } = useQueueStore();
  const isSelected = selectedItemIds.includes(item.id);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFormatIcon = () => {
    const fmt = item.file.detectedFormat;
    if (["png", "jpeg", "jpg", "webp", "bmp", "ico"].includes(fmt)) {
      return <Image className="w-4 h-4 text-relay-primary" />;
    }
    if (fmt === "pdf") {
      return <FileText className="w-4 h-4 text-relay-warning" />;
    }
    if (["csv", "json"].includes(fmt)) {
      return <Database className="w-4 h-4 text-relay-success" />;
    }
    return <HelpCircle className="w-4 h-4 text-relay-faint" />;
  };

  const handleRowClick = (e: React.MouseEvent) => {
    selectItem(item.id, e.ctrlKey || e.metaKey);
  };

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.outputPath) {
      revealInFileManager(item.outputPath);
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const target = e.target.value as any;
    setItemOperation(item.id, "image_transcode", target);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group px-3 py-2.5 rounded-sm border transition-colors flex items-center justify-between font-mono text-xs cursor-pointer ${
        isSelected
          ? "bg-relay-raised border-relay-primary/50 text-relay-text"
          : "bg-relay-surface border-relay-border hover:border-relay-muted/40 text-relay-muted"
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
        <div className="p-1.5 rounded-xs bg-relay-bg border border-relay-border shrink-0">
          {getFormatIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-relay-text truncate" title={item.file.name}>
              {item.file.name}
            </span>
            <span className="px-1.5 py-0.2 bg-relay-bg border border-relay-border rounded-xs text-[10px] text-relay-faint uppercase">
              {item.file.detectedFormat}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-relay-faint mt-0.5">
            <span>{formatBytes(item.file.sizeBytes)}</span>
            {item.file.width && item.file.height && (
              <span>{item.file.width} x {item.file.height} px</span>
            )}
            {item.file.pageCount && (
              <span>{item.file.pageCount} pages</span>
            )}
            {item.durationMs && (
              <span>{item.durationMs}ms</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 shrink-0">
        {/* Target Format Selector */}
        {["png", "jpeg", "jpg", "webp", "bmp", "ico"].includes(item.file.detectedFormat) && (
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] text-relay-faint">To:</span>
            <select
              value={item.targetFormat || "webp"}
              onChange={handleTargetChange}
              disabled={item.status === "processing"}
              className="bg-relay-bg border border-relay-border text-relay-text text-xs rounded-xs px-2 py-1 outline-none focus:border-relay-primary"
            >
              <option value="webp">WEBP</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="bmp">BMP</option>
              <option value="ico">ICO</option>
            </select>
          </div>
        )}

        {/* Status Display */}
        <div className="w-24 text-right">
          {item.status === "idle" && (
            <span className="text-relay-faint text-[11px]">Ready</span>
          )}
          {item.status === "pending" && (
            <span className="text-relay-warning text-[11px]">Queued</span>
          )}
          {item.status === "processing" && (
            <div className="flex items-center justify-end space-x-1 text-relay-primary text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{item.progressPercent}%</span>
            </div>
          )}
          {item.status === "completed" && (
            <div className="flex items-center justify-end space-x-1 text-relay-success text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
          )}
          {item.status === "failed" && (
            <div className="flex items-center justify-end space-x-1 text-relay-error text-[11px]" title={item.errorMessage}>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Error</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {item.status === "completed" && item.outputPath && (
            <button
              onClick={handleReveal}
              title="Reveal in folder"
              className="p-1 hover:bg-relay-border rounded-xs text-relay-muted hover:text-relay-text transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              removeItems([item.id]);
            }}
            title="Remove item"
            className="p-1 hover:bg-relay-error/20 rounded-xs text-relay-faint hover:text-relay-error transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

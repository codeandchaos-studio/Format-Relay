import React, { useState } from "react";
import { History, Trash2, FolderOpen, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { revealInFileManager } from "../../lib/tauriBridge";
import { useHistoryStore } from "../../stores/historyStore";

export const HistoryView: React.FC = () => {
  const { records, clearHistory, removeRecord } = useHistoryStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRecords = records.filter(
    (r) =>
      r.sourceFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.targetFormat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleClearHistory = () => {
    clearHistory();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-relay-bg p-6 font-mono text-xs">
      <div className="flex items-center justify-between pb-4 border-b border-relay-border mb-4">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-relay-primary" />
          <h2 className="text-sm font-bold text-relay-text uppercase tracking-wide">
            Conversion History
          </h2>
        </div>

        {records.length > 0 && (
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-relay-faint" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-relay-surface border border-relay-border rounded-xs pl-8 pr-3 py-1 text-relay-text outline-none focus:border-relay-primary w-48"
              />
            </div>

            <button
              onClick={handleClearHistory}
              className="flex items-center space-x-1 px-3 py-1 text-relay-faint hover:text-relay-error bg-relay-surface hover:bg-relay-surface/80 border border-relay-border rounded-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-relay-border rounded-sm bg-relay-surface/30">
          <div className="w-10 h-10 rounded-sm bg-relay-raised border border-relay-border flex items-center justify-center mb-3 text-relay-faint">
            <History className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-relay-text mb-1">
            No conversion history
          </h3>
          <p className="text-relay-muted max-w-sm text-[11px] leading-relaxed">
            Completed conversions will be recorded locally in your local database. No cloud tracking or external analytics are ever collected.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredRecords.map((r) => (
            <div
              key={r.id}
              className="px-3 py-2.5 bg-relay-surface border border-relay-border rounded-sm flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                {r.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-relay-success shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-relay-error shrink-0" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-relay-text">{r.sourceFileName}</span>
                    <span className="text-relay-faint">to</span>
                    <span className="px-1.5 py-0.2 bg-relay-bg border border-relay-border rounded-xs text-[10px] text-relay-primary uppercase">
                      {r.targetFormat}
                    </span>
                  </div>
                  <div className="text-[11px] text-relay-faint mt-0.5 space-x-3">
                    <span>{formatBytes(r.sizeBytesBefore)} to {formatBytes(r.sizeBytesAfter)}</span>
                    <span>{r.durationMs}ms</span>
                    <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {r.outputPath && (
                  <button
                    onClick={() => revealInFileManager(r.outputPath)}
                    title="Reveal in folder"
                    className="p-1.5 hover:bg-relay-border rounded-xs text-relay-muted hover:text-relay-text transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => removeRecord(r.id)}
                  title="Remove from history"
                  className="p-1.5 hover:bg-relay-error/20 rounded-xs text-relay-faint hover:text-relay-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

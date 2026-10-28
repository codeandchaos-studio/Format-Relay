import React from "react";
import { HardDrive, Activity, Lock } from "lucide-react";
import { useQueueStore } from "../../stores/queueStore";
import { useSettingsStore } from "../../stores/settingsStore";

export const StatusFooter: React.FC = () => {
  const { items, isProcessing } = useQueueStore();
  const { maxConcurrency } = useSettingsStore();

  const completedCount = items.filter((i) => i.status === "completed").length;
  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "processing").length;

  return (
    <footer className="h-7 border-t border-relay-border bg-relay-surface flex items-center justify-between px-3 text-[11px] font-mono text-relay-muted select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? "bg-relay-warning animate-pulse" : "bg-relay-success"}`} />
          <span className="text-relay-text">
            {isProcessing ? "Converting" : "System Ready"}
          </span>
        </div>

        <div className="flex items-center space-x-1 text-relay-faint">
          <HardDrive className="w-3 h-3" />
          <span>Native Engines: Image, PDF, Data</span>
        </div>

        <div className="flex items-center space-x-1 text-relay-faint">
          <Activity className="w-3 h-3" />
          <span>Workers: {maxConcurrency} threads</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {pendingCount > 0 && (
          <span className="text-relay-warning font-semibold">
            {pendingCount} in queue
          </span>
        )}
        {completedCount > 0 && (
          <span className="text-relay-success font-semibold">
            {completedCount} finished
          </span>
        )}
        <div className="flex items-center space-x-1 text-relay-faint">
          <Lock className="w-2.5 h-2.5" />
          <span>100% Offline : Zero Telemetry</span>
        </div>
      </div>
    </footer>
  );
};

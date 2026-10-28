import React from "react";
import { useQueueStore } from "../../stores/queueStore";
import { Layers, History, Settings, ShieldCheck } from "lucide-react";

export const Header: React.FC = () => {
  const { activeView, setActiveView, items } = useQueueStore();
  const queueCount = items.length;

  return (
    <header className="h-14 border-b border-relay-border bg-relay-surface flex items-center justify-between px-4 select-none">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-relay-primary rounded-sm flex items-center justify-center font-mono font-bold text-xs text-white">
            FR
          </div>
          <span className="font-mono font-bold tracking-tight text-sm text-relay-text">
            FORMAT RELAY
          </span>
        </div>
        <span className="text-relay-border text-sm">/</span>
        <span className="text-xs text-relay-faint font-mono hidden md:inline">
          CODE & CHAOS
        </span>
      </div>

      <nav className="flex items-center space-x-1">
        <button
          onClick={() => setActiveView("queue")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${
            activeView === "queue"
              ? "bg-relay-raised text-relay-text border border-relay-border"
              : "text-relay-muted hover:text-relay-text hover:bg-relay-raised/50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Queue</span>
          {queueCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-relay-primary/20 text-relay-primary rounded-xs text-[10px] font-bold">
              {queueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView("history")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${
            activeView === "history"
              ? "bg-relay-raised text-relay-text border border-relay-border"
              : "text-relay-muted hover:text-relay-text hover:bg-relay-raised/50"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        <button
          onClick={() => setActiveView("settings")}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-mono transition-colors ${
            activeView === "settings"
              ? "bg-relay-raised text-relay-text border border-relay-border"
              : "text-relay-muted hover:text-relay-text hover:bg-relay-raised/50"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </nav>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 px-2 py-1 bg-relay-bg border border-relay-border rounded-xs text-[11px] text-relay-muted font-mono">
          <ShieldCheck className="w-3 h-3 text-relay-success" />
          <span>Local Engine Active</span>
        </div>
      </div>
    </header>
  );
};

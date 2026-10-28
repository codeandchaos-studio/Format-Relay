import React from "react";
import { useSettingsStore, CollisionStrategy } from "../../stores/settingsStore";
import { openDirectoryPicker } from "../../lib/tauriBridge";
import { Settings, Folder, Cpu, FileCheck, Info, Moon, Sun } from "lucide-react";

export const SettingsView: React.FC = () => {
  const {
    outputDirectory,
    setOutputDirectory,
    collisionStrategy,
    setCollisionStrategy,
    maxConcurrency,
    setMaxConcurrency,
    openFolderOnCompletion,
    setOpenFolderOnCompletion,
    theme,
    setTheme,
  } = useSettingsStore();

  const handleSelectOutputFolder = async () => {
    const selected = await openDirectoryPicker();
    if (selected) {
      setOutputDirectory(selected);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-relay-bg p-6 font-mono text-xs overflow-y-auto">
      <div className="flex items-center space-x-2 pb-4 border-b border-relay-border mb-6">
        <Settings className="w-4 h-4 text-relay-primary" />
        <h2 className="text-sm font-bold text-relay-text uppercase tracking-wide">
          Application Preferences
        </h2>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Output Directory */}
        <section className="space-y-2">
          <label className="text-relay-text font-semibold flex items-center space-x-2">
            <Folder className="w-3.5 h-3.5 text-relay-primary" />
            <span>Default Output Directory</span>
          </label>
          <p className="text-relay-faint text-[11px]">
            Leave empty to write converted files adjacent to their source files.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={outputDirectory || "Same as source file (default)"}
              className="flex-1 bg-relay-surface border border-relay-border rounded-xs px-3 py-1.5 text-relay-muted outline-none"
            />
            <button
              onClick={handleSelectOutputFolder}
              className="px-3 py-1.5 bg-relay-raised hover:bg-relay-border border border-relay-border text-relay-text rounded-xs transition-colors shrink-0"
            >
              Browse
            </button>
            {outputDirectory && (
              <button
                onClick={() => setOutputDirectory("")}
                className="px-2 py-1.5 text-relay-faint hover:text-relay-error text-[11px]"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Filename Collision Strategy */}
        <section className="space-y-2 pt-4 border-t border-relay-border">
          <label className="text-relay-text font-semibold flex items-center space-x-2">
            <FileCheck className="w-3.5 h-3.5 text-relay-success" />
            <span>Output Conflict Strategy</span>
          </label>
          <p className="text-relay-faint text-[11px]">
            Behavior when an output file with the target name already exists on disk.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "rename", label: "Append Suffix (e.g. _1)", desc: "Safest: Never replaces files" },
                { id: "overwrite", label: "Overwrite Existing", desc: "Replaces target directly" },
                { id: "skip", label: "Skip Conversion", desc: "Leaves target unchanged" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCollisionStrategy(opt.id as CollisionStrategy)}
                className={`p-2.5 rounded-xs border text-left transition-colors ${
                  collisionStrategy === opt.id
                    ? "bg-relay-primary/10 border-relay-primary text-relay-text"
                    : "bg-relay-surface border-relay-border text-relay-muted hover:border-relay-muted/50"
                }`}
              >
                <div className="font-semibold text-xs mb-1">{opt.label}</div>
                <div className="text-[10px] text-relay-faint">{opt.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Concurrency and Threads */}
        <section className="space-y-2 pt-4 border-t border-relay-border">
          <div className="flex justify-between items-center">
            <label className="text-relay-text font-semibold flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-relay-warning" />
              <span>Concurrent Worker Threads</span>
            </label>
            <span className="text-relay-primary font-bold">{maxConcurrency} workers</span>
          </div>
          <p className="text-relay-faint text-[11px]">
            Maximum simultaneous conversions executed in background threads.
          </p>
          <input
            type="range"
            min="1"
            max="16"
            value={maxConcurrency}
            onChange={(e) => setMaxConcurrency(parseInt(e.target.value, 10))}
            className="w-full accent-relay-primary bg-relay-surface h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-relay-faint">
            <span>1 Worker (Low CPU)</span>
            <span>16 Workers (High Concurrency)</span>
          </div>
        </section>

        {/* Workflow Automation */}
        <section className="space-y-3 pt-4 border-t border-relay-border">
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={openFolderOnCompletion}
              onChange={(e) => setOpenFolderOnCompletion(e.target.checked)}
              className="accent-relay-primary rounded-xs"
            />
            <span className="text-relay-text font-semibold text-xs">
              Reveal destination folder upon completion of batch
            </span>
          </label>
        </section>

        {/* UI Theme Toggle */}
        <section className="space-y-2 pt-4 border-t border-relay-border">
          <label className="text-relay-text font-semibold block text-xs">
            Interface Theme
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xs border text-xs ${
                theme === "dark"
                  ? "bg-relay-primary/10 border-relay-primary text-relay-primary"
                  : "bg-relay-surface border-relay-border text-relay-muted"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Carbon</span>
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xs border text-xs ${
                theme === "light"
                  ? "bg-relay-primary/10 border-relay-primary text-relay-primary"
                  : "bg-relay-surface border-relay-border text-relay-muted"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Workspace</span>
            </button>
          </div>
        </section>

        {/* About & Studio Information */}
        <section className="p-4 bg-relay-surface border border-relay-border rounded-sm space-y-2 mt-8">
          <div className="flex items-center space-x-2 text-relay-text font-bold">
            <Info className="w-4 h-4 text-relay-primary" />
            <span>FORMAT RELAY</span>
          </div>
          <p className="text-[11px] text-relay-muted leading-relaxed">
            Every file. Ready for what's next. A cross-platform desktop toolkit engineered for high-performance, local-first file operations.
          </p>
          <div className="pt-2 border-t border-relay-border/60 flex items-center justify-between text-[11px] text-relay-faint">
            <span>CODE & CHAOS : we built stuff</span>
            <span>Independent Collective of Three Developers</span>
          </div>
        </section>
      </div>
    </div>
  );
};

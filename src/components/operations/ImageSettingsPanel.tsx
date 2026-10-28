import React from "react";
import { useQueueStore } from "../../stores/queueStore";
import { Sliders, Maximize2, ShieldAlert } from "lucide-react";

export const ImageSettingsPanel: React.FC = () => {
  const { globalImageOptions, setGlobalImageOptions } = useQueueStore();

  const handleFormatChange = (fmt: "png" | "jpeg" | "webp" | "bmp" | "ico") => {
    setGlobalImageOptions({ targetFormat: fmt });
  };

  const isLossy = globalImageOptions.targetFormat === "jpeg" || globalImageOptions.targetFormat === "webp";
  const noTransparency = globalImageOptions.targetFormat === "jpeg" || globalImageOptions.targetFormat === "bmp";

  return (
    <div className="bg-relay-surface border-l border-relay-border w-80 p-4 flex flex-col font-mono text-xs select-none overflow-y-auto">
      <div className="flex items-center space-x-2 pb-3 border-b border-relay-border mb-4">
        <Sliders className="w-4 h-4 text-relay-primary" />
        <span className="font-bold text-relay-text uppercase tracking-wider text-[11px]">
          Operation Settings
        </span>
      </div>

      {/* Target Format Selector */}
      <div className="mb-5">
        <label className="text-relay-muted font-semibold block mb-2 text-[11px]">
          Target Format
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(["webp", "png", "jpeg", "bmp", "ico"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleFormatChange(fmt)}
              className={`py-1.5 px-2 rounded-xs border text-center uppercase font-mono font-semibold transition-colors ${
                globalImageOptions.targetFormat === fmt
                  ? "bg-relay-primary/10 border-relay-primary text-relay-primary"
                  : "bg-relay-bg border-relay-border text-relay-muted hover:border-relay-muted/50 hover:text-relay-text"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Transparency Warning Notice */}
      {noTransparency && (
        <div className="mb-4 p-2 bg-relay-bg border border-relay-warning/40 rounded-xs flex items-start space-x-2 text-[11px] text-relay-muted">
          <ShieldAlert className="w-3.5 h-3.5 text-relay-warning shrink-0 mt-0.5" />
          <span>
            {globalImageOptions.targetFormat.toUpperCase()} does not support alpha channels. Transparent pixels will be flattened to matte color.
          </span>
        </div>
      )}

      {/* Compression Quality Slider */}
      {isLossy && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-relay-muted font-semibold text-[11px]">
              Quality
            </label>
            <span className="text-relay-primary font-bold">
              {globalImageOptions.quality}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={globalImageOptions.quality}
            onChange={(e) => setGlobalImageOptions({ quality: parseInt(e.target.value, 10) })}
            className="w-full accent-relay-primary bg-relay-bg h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-relay-faint mt-1">
            <span>Smaller File</span>
            <span>Maximum Fidelity</span>
          </div>
        </div>
      )}

      {/* Resize Options */}
      <div className="mb-5 pt-3 border-t border-relay-border">
        <div className="flex items-center justify-between mb-2.5">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={globalImageOptions.resizeEnabled}
              onChange={(e) => setGlobalImageOptions({ resizeEnabled: e.target.checked })}
              className="accent-relay-primary rounded-xs"
            />
            <span className="text-relay-muted font-semibold text-[11px]">
              Resize Dimensions
            </span>
          </label>
          <Maximize2 className="w-3.5 h-3.5 text-relay-faint" />
        </div>

        {globalImageOptions.resizeEnabled && (
          <div className="space-y-2.5 pl-4 pt-1 border-l-2 border-relay-border">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-relay-faint block mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  placeholder="Auto"
                  value={globalImageOptions.width || ""}
                  onChange={(e) =>
                    setGlobalImageOptions({
                      width: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full bg-relay-bg border border-relay-border rounded-xs px-2 py-1 text-relay-text outline-none focus:border-relay-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-relay-faint block mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  placeholder="Auto"
                  value={globalImageOptions.height || ""}
                  onChange={(e) =>
                    setGlobalImageOptions({
                      height: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full bg-relay-bg border border-relay-border rounded-xs px-2 py-1 text-relay-text outline-none focus:border-relay-primary"
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 text-[11px] text-relay-faint cursor-pointer">
              <input
                type="checkbox"
                checked={globalImageOptions.preserveAspectRatio}
                onChange={(e) =>
                  setGlobalImageOptions({ preserveAspectRatio: e.target.checked })
                }
                className="accent-relay-primary rounded-xs"
              />
              <span>Preserve aspect ratio</span>
            </label>
          </div>
        )}
      </div>

      {/* Engine Info Box */}
      <div className="mt-auto p-2.5 bg-relay-bg border border-relay-border rounded-xs">
        <div className="text-[10px] font-bold text-relay-muted uppercase mb-1">
          Active Engine
        </div>
        <div className="text-[11px] text-relay-faint leading-relaxed">
          Native Rust Image transcode engine (zero telemetry, zero cloud calls). Output verified on completion.
        </div>
      </div>
    </div>
  );
};

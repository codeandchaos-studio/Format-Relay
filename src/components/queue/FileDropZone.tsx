import React, { useState, useRef } from "react";
import { UploadCloud, FolderOpen, Image, FileText, Database } from "lucide-react";
import { useQueueStore } from "../../stores/queueStore";
import { openFilePicker, inspectFile } from "../../lib/tauriBridge";
import { FileMetadata } from "../../types/format";

export const FileDropZone: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { addFiles } = useQueueStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseFiles = async () => {
    try {
      const selectedPaths = await openFilePicker();
      if (selectedPaths && selectedPaths.length > 0) {
        const inspected: FileMetadata[] = [];
        for (const path of selectedPaths) {
          const meta = await inspectFile(path);
          inspected.push(meta);
        }
        addFiles(inspected);
      }
    } catch {
      // If native dialog fails or running in web preview, trigger HTML input
      fileInputRef.current?.click();
    }
  };

  const handleNativeHtmlInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const inspected: FileMetadata[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      inspected.push({
        path: f.name,
        name: f.name,
        sizeBytes: f.size,
        detectedFormat: (ext === "jpg" ? "jpeg" : ext) as any,
        mimeType: f.type || "application/octet-stream",
        isValid: true,
      });
    }
    addFiles(inspected);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const inspected: FileMetadata[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        // In Tauri or webview, file.path or file.name is accessible
        const path = (file as any).path || file.name;
        const meta = await inspectFile(path);
        if (meta.sizeBytes === 0 && file.size > 0) {
          meta.sizeBytes = file.size;
        }
        inspected.push(meta);
      }
      addFiles(inspected);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-dashed rounded-sm p-6 text-center transition-colors flex flex-col items-center justify-center cursor-pointer ${
        isDragOver
          ? "border-relay-primary bg-relay-primary/5"
          : "border-relay-border hover:border-relay-muted/50 bg-relay-surface/40 hover:bg-relay-surface"
      }`}
      onClick={handleBrowseFiles}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeHtmlInput}
        multiple
        className="hidden"
      />

      <div className="w-12 h-12 rounded-sm bg-relay-raised border border-relay-border flex items-center justify-center mb-3 text-relay-primary">
        <UploadCloud className="w-6 h-6" />
      </div>

      <h3 className="font-mono text-sm font-semibold text-relay-text mb-1">
        Drag and drop files here, or click to browse
      </h3>
      <p className="text-xs text-relay-muted mb-4 max-w-sm">
        Direct processing for images, documents, and structured data with strict output integrity checks.
      </p>

      <div className="flex items-center space-x-2 text-[11px] font-mono text-relay-faint">
        <span className="flex items-center space-x-1 px-2 py-0.5 bg-relay-raised border border-relay-border rounded-xs">
          <Image className="w-3 h-3 text-relay-primary" />
          <span>PNG, JPEG, WebP, BMP, ICO</span>
        </span>
        <span className="flex items-center space-x-1 px-2 py-0.5 bg-relay-raised border border-relay-border rounded-xs">
          <FileText className="w-3 h-3 text-relay-warning" />
          <span>PDF</span>
        </span>
        <span className="flex items-center space-x-1 px-2 py-0.5 bg-relay-raised border border-relay-border rounded-xs">
          <Database className="w-3 h-3 text-relay-success" />
          <span>CSV, JSON</span>
        </span>
      </div>

      <button
        type="button"
        className="mt-4 px-3 py-1.5 bg-relay-raised hover:bg-relay-border border border-relay-border text-relay-text font-mono text-xs rounded-sm flex items-center space-x-1.5 transition-colors"
      >
        <FolderOpen className="w-3.5 h-3.5 text-relay-primary" />
        <span>Browse Local Files</span>
      </button>
    </div>
  );
};

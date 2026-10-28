import { create } from "zustand";
import { QueueItem, JobStatus } from "../types/job";
import { FileMetadata, SupportedFormat } from "../types/format";
import { OperationId, ImageConversionOptions } from "../types/capability";

interface QueueStore {
  items: QueueItem[];
  selectedItemIds: string[];
  activeView: "queue" | "history" | "settings";
  activeOperationsTab: "image" | "pdf" | "data";
  isProcessing: boolean;
  globalImageOptions: ImageConversionOptions;

  // Actions
  setActiveView: (view: "queue" | "history" | "settings") => void;
  setActiveOperationsTab: (tab: "image" | "pdf" | "data") => void;
  addFiles: (files: FileMetadata[]) => void;
  removeItems: (ids: string[]) => void;
  clearQueue: () => void;
  selectItem: (id: string, multiSelect?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setItemOperation: (id: string, op: OperationId, targetFormat: SupportedFormat) => void;
  setBatchOperation: (op: OperationId, targetFormat: SupportedFormat) => void;
  updateItemStatus: (id: string, status: JobStatus, progress?: number, outputPath?: string, error?: string) => void;
  setGlobalImageOptions: (options: Partial<ImageConversionOptions>) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

const defaultImageOptions: ImageConversionOptions = {
  targetFormat: "webp",
  quality: 85,
  resizeEnabled: false,
  resizeMode: "fit",
  preserveAspectRatio: true,
  matteColor: "#FFFFFF",
};

export const useQueueStore = create<QueueStore>((set) => ({
  items: [],
  selectedItemIds: [],
  activeView: "queue",
  activeOperationsTab: "image",
  isProcessing: false,
  globalImageOptions: defaultImageOptions,

  setActiveView: (activeView) => set({ activeView }),
  setActiveOperationsTab: (activeOperationsTab) => set({ activeOperationsTab }),

  addFiles: (newFiles) =>
    set((state) => {
      // Filter out duplicates by path
      const existingPaths = new Set(state.items.map((i) => i.file.path));
      const freshItems: QueueItem[] = newFiles
        .filter((f) => !existingPaths.has(f.path))
        .map((f) => ({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file: f,
          status: "idle",
          progressPercent: 0,
        }));

      const merged = [...state.items, ...freshItems];
      let newTab = state.activeOperationsTab;
      if (freshItems.length > 0) {
        const firstFmt = freshItems[0].file.detectedFormat;
        if (firstFmt === "pdf") newTab = "pdf";
        else if (["csv", "json"].includes(firstFmt)) newTab = "data";
        else if (["png", "jpeg", "webp", "bmp", "ico"].includes(firstFmt)) newTab = "image";
      }

      return {
        items: merged,
        activeOperationsTab: newTab,
        selectedItemIds: freshItems.length > 0 && state.selectedItemIds.length === 0
          ? [freshItems[0].id]
          : state.selectedItemIds,
      };
    }),

  removeItems: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        items: state.items.filter((item) => !idSet.has(item.id)),
        selectedItemIds: state.selectedItemIds.filter((id) => !idSet.has(id)),
      };
    }),

  clearQueue: () => set({ items: [], selectedItemIds: [] }),

  selectItem: (id, multiSelect = false) =>
    set((state) => {
      const targetItem = state.items.find((i) => i.id === id);
      let newTab = state.activeOperationsTab;
      if (targetItem) {
        if (targetItem.file.detectedFormat === "pdf") {
          newTab = "pdf";
        } else if (["png", "jpeg", "webp", "bmp", "ico"].includes(targetItem.file.detectedFormat)) {
          newTab = "image";
        } else if (["csv", "json"].includes(targetItem.file.detectedFormat)) {
          newTab = "data";
        }
      }

      if (multiSelect) {
        const isSelected = state.selectedItemIds.includes(id);
        return {
          activeOperationsTab: newTab,
          selectedItemIds: isSelected
            ? state.selectedItemIds.filter((i) => i !== id)
            : [...state.selectedItemIds, id],
        };
      }
      return {
        activeOperationsTab: newTab,
        selectedItemIds: [id],
      };
    }),

  selectAll: () => set((state) => ({ selectedItemIds: state.items.map((i) => i.id) })),

  clearSelection: () => set({ selectedItemIds: [] }),

  setItemOperation: (id, operation, targetFormat) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, selectedOperation: operation, targetFormat }
          : item
      ),
    })),

  setBatchOperation: (operation, targetFormat) =>
    set((state) => ({
      items: state.items.map((item) => ({
        ...item,
        selectedOperation: operation,
        targetFormat,
      })),
    })),

  updateItemStatus: (id, status, progress, outputPath, errorMessage) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              progressPercent: progress !== undefined ? progress : item.progressPercent,
              outputPath: outputPath !== undefined ? outputPath : item.outputPath,
              errorMessage: errorMessage !== undefined ? errorMessage : item.errorMessage,
            }
          : item
      ),
    })),

  setGlobalImageOptions: (options) =>
    set((state) => ({
      globalImageOptions: { ...state.globalImageOptions, ...options },
    })),

  setIsProcessing: (isProcessing) => set({ isProcessing }),
}));

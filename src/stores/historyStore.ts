import { create } from "zustand";
import { HistoryRecord } from "../types/job";

interface HistoryStore {
  records: HistoryRecord[];
  addRecord: (record: Omit<HistoryRecord, "id" | "timestamp">) => void;
  clearHistory: () => void;
  removeRecord: (id: string) => void;
}

const STORAGE_KEY = "format_relay_history_records";

const loadPersistedHistory = (): HistoryRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistHistory = (records: HistoryRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 500))); // Keep up to 500 records
  } catch {
    // Local storage quota handled safely
  }
};

export const useHistoryStore = create<HistoryStore>((set) => ({
  records: loadPersistedHistory(),

  addRecord: (rec) =>
    set((state) => {
      const newRecord: HistoryRecord = {
        ...rec,
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      const updated = [newRecord, ...state.records];
      persistHistory(updated);
      return { records: updated };
    }),

  clearHistory: () => {
    persistHistory([]);
    set({ records: [] });
  },

  removeRecord: (id) =>
    set((state) => {
      const updated = state.records.filter((r) => r.id !== id);
      persistHistory(updated);
      return { records: updated };
    }),
}));

import { create } from "zustand";

export type CollisionStrategy = "rename" | "overwrite" | "skip";

export interface AppSettings {
  outputDirectory: string; // empty means same directory as source
  collisionStrategy: CollisionStrategy;
  maxConcurrency: number;
  openFolderOnCompletion: boolean;
  theme: "dark" | "light";
  preserveTimestamps: boolean;
}

interface SettingsStore extends AppSettings {
  setOutputDirectory: (dir: string) => void;
  setCollisionStrategy: (strat: CollisionStrategy) => void;
  setMaxConcurrency: (concurrency: number) => void;
  setOpenFolderOnCompletion: (open: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  setPreserveTimestamps: (preserve: boolean) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "format_relay_settings";

const defaultSettings: AppSettings = {
  outputDirectory: "",
  collisionStrategy: "rename",
  maxConcurrency: 4,
  openFolderOnCompletion: false,
  theme: "dark",
  preserveTimestamps: false,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  setOutputDirectory: (outputDirectory) => {
    set({ outputDirectory });
    get().saveSettings();
  },

  setCollisionStrategy: (collisionStrategy) => {
    set({ collisionStrategy });
    get().saveSettings();
  },

  setMaxConcurrency: (maxConcurrency) => {
    set({ maxConcurrency });
    get().saveSettings();
  },

  setOpenFolderOnCompletion: (openFolderOnCompletion) => {
    set({ openFolderOnCompletion });
    get().saveSettings();
  },

  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },

  setPreserveTimestamps: (preserveTimestamps) => {
    set({ preserveTimestamps });
    get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set((state) => ({ ...state, ...parsed }));
      }
    } catch {
      // Use defaults if parse fails
    }
  },

  saveSettings: async () => {
    try {
      const current = get();
      const payload: AppSettings = {
        outputDirectory: current.outputDirectory,
        collisionStrategy: current.collisionStrategy,
        maxConcurrency: current.maxConcurrency,
        openFolderOnCompletion: current.openFolderOnCompletion,
        theme: current.theme,
        preserveTimestamps: current.preserveTimestamps,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore local storage write errors
    }
  },
}));

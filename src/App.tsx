import React, { useEffect } from "react";
import { Header } from "./components/layout/Header";
import { StatusFooter } from "./components/layout/StatusFooter";
import { FileQueueList } from "./components/queue/FileQueueList";
import { ImageSettingsPanel } from "./components/operations/ImageSettingsPanel";
import { PdfSettingsPanel } from "./components/operations/PdfSettingsPanel";
import { DataSettingsPanel } from "./components/operations/DataSettingsPanel";
import { HistoryView } from "./components/history/HistoryView";
import { SettingsView } from "./components/settings/SettingsView";
import { useQueueStore } from "./stores/queueStore";
import { useSettingsStore } from "./stores/settingsStore";
import { Image, FileText, Database } from "lucide-react";

export const App: React.FC = () => {
  const { activeView, activeOperationsTab, setActiveOperationsTab } = useQueueStore();
  const { loadSettings, theme } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-relay-bg font-sans select-none">
      <Header />

      <main className="flex-1 flex min-h-0 overflow-hidden">
        {activeView === "queue" && (
          <>
            <FileQueueList />
            <div className="flex flex-col border-l border-relay-border">
              <div className="flex items-center bg-relay-surface border-b border-relay-border font-mono text-[11px] select-none">
                <button
                  onClick={() => setActiveOperationsTab("image")}
                  className={`flex-1 py-2 px-2 flex items-center justify-center space-x-1 font-bold uppercase transition-colors ${
                    activeOperationsTab === "image"
                      ? "text-relay-primary border-b-2 border-relay-primary bg-relay-raised/40"
                      : "text-relay-faint hover:text-relay-muted"
                  }`}
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>Image</span>
                </button>
                <button
                  onClick={() => setActiveOperationsTab("pdf")}
                  className={`flex-1 py-2 px-2 flex items-center justify-center space-x-1 font-bold uppercase transition-colors ${
                    activeOperationsTab === "pdf"
                      ? "text-relay-primary border-b-2 border-relay-primary bg-relay-raised/40"
                      : "text-relay-faint hover:text-relay-muted"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => setActiveOperationsTab("data")}
                  className={`flex-1 py-2 px-2 flex items-center justify-center space-x-1 font-bold uppercase transition-colors ${
                    activeOperationsTab === "data"
                      ? "text-relay-primary border-b-2 border-relay-primary bg-relay-raised/40"
                      : "text-relay-faint hover:text-relay-muted"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Data</span>
                </button>
              </div>

              {activeOperationsTab === "pdf" && <PdfSettingsPanel />}
              {activeOperationsTab === "image" && <ImageSettingsPanel />}
              {activeOperationsTab === "data" && <DataSettingsPanel />}
            </div>
          </>
        )}
        {activeView === "history" && <HistoryView />}
        {activeView === "settings" && <SettingsView />}
      </main>

      <StatusFooter />
    </div>
  );
};

export default App;

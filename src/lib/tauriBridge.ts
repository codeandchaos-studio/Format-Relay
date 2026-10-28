import { FileMetadata, SupportedFormat } from "../types/format";
import { ImageConversionOptions } from "../types/capability";

// Check if running inside Tauri window
export const isTauriContext = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// Safe invoke wrapper
async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauriContext()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
  }
  throw new Error("Desktop runtime interface is unavailable in standard browser view.");
}

// Open native file picker
export async function openFilePicker(): Promise<string[]> {
  if (isTauriContext()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      multiple: true,
      directory: false,
      title: "Select Files for Conversion",
    });

    if (!result) return [];
    if (Array.isArray(result)) return result;
    return [result];
  }
  return [];
}

// Open native directory picker
export async function openDirectoryPicker(): Promise<string | null> {
  if (isTauriContext()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      directory: true,
      multiple: false,
      title: "Select Output Directory",
    });
    return result as string | null;
  }
  return null;
}

// Inspect file metadata via Rust backend
export async function inspectFile(filePath: string): Promise<FileMetadata> {
  if (isTauriContext()) {
    return invokeTauri<FileMetadata>("inspect_file", { path: filePath });
  }

  // Fallback metadata for browser simulation
  const name = filePath.split("/").pop()?.split("\\").pop() || "unknown";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  let detectedFormat: SupportedFormat = "unknown";
  let mimeType = "application/octet-stream";

  if (["png", "jpeg", "jpg", "webp", "bmp", "ico"].includes(ext)) {
    detectedFormat = (ext === "jpg" ? "jpeg" : ext) as SupportedFormat;
    mimeType = `image/${detectedFormat}`;
  } else if (ext === "pdf") {
    detectedFormat = "pdf";
    mimeType = "application/pdf";
  } else if (ext === "csv") {
    detectedFormat = "csv";
    mimeType = "text/csv";
  } else if (ext === "json") {
    detectedFormat = "json";
    mimeType = "application/json";
  }

  return {
    path: filePath,
    name,
    sizeBytes: 0,
    detectedFormat,
    mimeType,
    isValid: true,
  };
}

// Transcode image via native Rust engine
export interface ImageConversionPayload {
  inputPath: string;
  outputPath?: string;
  options: ImageConversionOptions;
}

export interface ConversionResult {
  success: boolean;
  outputPath: string;
  bytesWritten: number;
  durationMs: number;
  errorMessage?: string;
}

export interface PdfPageSummary {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PdfInfo {
  pageCount: number;
  version: string;
  isEncrypted: boolean;
  pages: PdfPageSummary[];
}

export interface PdfMergePayload {
  inputPaths: string[];
  outputPath?: string;
}

export interface PdfRotatePayload {
  inputPath: string;
  outputPath?: string;
  angle: number;
  pages?: number[];
}

export interface PdfExtractPayload {
  inputPath: string;
  outputPath?: string;
  pages: number[];
}

export interface PdfSplitPayload {
  inputPath: string;
  outputDir?: string;
}

export interface ImagesToPdfPayload {
  inputPaths: string[];
  outputPath?: string;
}

export async function convertImage(payload: ImageConversionPayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("convert_image", { payload });
}

export async function inspectPdf(path: string): Promise<PdfInfo> {
  return invokeTauri<PdfInfo>("inspect_pdf", { path });
}

export async function mergePdfs(payload: PdfMergePayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("merge_pdfs", { payload });
}

export async function rotatePdf(payload: PdfRotatePayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("rotate_pdf", { payload });
}

export async function extractPdfPages(payload: PdfExtractPayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("extract_pdf_pages", { payload });
}

export async function splitPdf(payload: PdfSplitPayload): Promise<string[]> {
  return invokeTauri<string[]>("split_pdf", { payload });
}

export async function convertImagesToPdf(payload: ImagesToPdfPayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("convert_images_to_pdf", { payload });
}

export interface CsvToJsonPayload {
  inputPath: string;
  outputPath?: string;
  delimiter?: string;
  pretty?: boolean;
}

export interface JsonToCsvPayload {
  inputPath: string;
  outputPath?: string;
  delimiter?: string;
}

export async function convertCsvToJson(payload: CsvToJsonPayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("convert_csv_to_json", { payload });
}

export async function convertJsonToCsv(payload: JsonToCsvPayload): Promise<ConversionResult> {
  return invokeTauri<ConversionResult>("convert_json_to_csv", { payload });
}

// Open containing folder
export async function revealInFileManager(filePath: string): Promise<void> {
  if (isTauriContext()) {
    await invokeTauri("reveal_in_explorer", { path: filePath });
  }
}

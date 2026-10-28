import { FileMetadata, SupportedFormat } from "./format";
import { OperationId, ImageConversionOptions, PdfConversionOptions, DataConversionOptions } from "./capability";

export type JobStatus = "idle" | "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface QueueItem {
  id: string;
  file: FileMetadata;
  selectedOperation?: OperationId;
  targetFormat?: SupportedFormat;
  status: JobStatus;
  progressPercent: number; // 0 to 100
  outputPath?: string;
  errorMessage?: string;
  durationMs?: number;
}

export type OperationSettings =
  | { type: "image"; options: ImageConversionOptions }
  | { type: "pdf"; options: PdfConversionOptions }
  | { type: "data"; options: DataConversionOptions };

export interface HistoryRecord {
  id: string;
  sourcePath: string;
  sourceFileName: string;
  sourceFormat: string;
  targetFormat: string;
  operationId: string;
  outputPath: string;
  sizeBytesBefore: number;
  sizeBytesAfter: number;
  durationMs: number;
  status: "success" | "failed";
  timestamp: string;
  errorMessage?: string;
}

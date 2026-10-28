export type FileCategory = "image" | "pdf" | "data" | "media" | "document" | "unknown";

export type ImageFormat = "png" | "jpeg" | "jpg" | "webp" | "bmp" | "ico";
export type PdfFormat = "pdf";
export type DataFormat = "csv" | "json";
export type SupportedFormat = ImageFormat | PdfFormat | DataFormat | "unknown";

export interface FileMetadata {
  path: string;
  name: string;
  sizeBytes: number;
  detectedFormat: SupportedFormat;
  mimeType: string;
  width?: number;
  height?: number;
  pageCount?: number;
  isValid: boolean;
  validationError?: string;
}

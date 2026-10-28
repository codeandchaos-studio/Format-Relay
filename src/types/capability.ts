import { FileCategory, SupportedFormat } from "./format";

export type OperationId =
  | "image_transcode"
  | "image_resize"
  | "image_to_pdf"
  | "pdf_merge"
  | "pdf_split"
  | "pdf_rotate"
  | "data_csv_to_json"
  | "data_json_to_csv";

export interface OperationCapability {
  id: OperationId;
  label: string;
  category: FileCategory;
  inputFormats: SupportedFormat[];
  outputFormat: SupportedFormat;
  engine: "native_image" | "native_pdf" | "native_data" | "external_ffmpeg" | "external_libreoffice";
  batchCapable: boolean;
  isAvailable: boolean;
  description: string;
}

export interface ImageConversionOptions {
  targetFormat: "png" | "jpeg" | "webp" | "bmp" | "ico";
  quality: number; // 1 to 100
  resizeEnabled: boolean;
  resizeMode: "fit" | "exact" | "percent";
  width?: number;
  height?: number;
  percent?: number;
  preserveAspectRatio: boolean;
  matteColor: string; // Hex color for flattened transparency, e.g. #FFFFFF
}

export interface PdfConversionOptions {
  operation: "merge" | "split" | "rotate";
  rotationAngle?: 90 | 180 | 270;
  pageRange?: string; // e.g. "1-3, 5"
}

export interface DataConversionOptions {
  delimiter: "," | "\t" | ";";
  prettyJson: boolean;
}

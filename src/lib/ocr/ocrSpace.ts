const OCR_SPACE_URL = "https://api.ocr.space/parse/image";

export interface OCRSpaceParsedResult {
  ParsedText?: string;
  TextOverlay?: {
    Lines?: Array<{
      LineText?: string;
      Words?: Array<{ WordText?: string }>;
    }>;
  };
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
}

export interface OCRSpaceResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
  ParsedResults?: OCRSpaceParsedResult[];
}

export class OCRSpaceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OCRSpaceError";
    this.status = status;
  }
}

export async function parseReceiptWithOCRSpace(file: File): Promise<OCRSpaceResponse> {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new OCRSpaceError("OCR service is not configured on the server.", 500);
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("isOverlayRequired", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");

  const response = await fetch(OCR_SPACE_URL, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Accept: "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new OCRSpaceError(`OCR service returned ${response.status}.`, response.status);
  }

  let payload: OCRSpaceResponse;

  try {
    payload = (await response.json()) as OCRSpaceResponse;
  } catch {
    throw new OCRSpaceError("OCR service returned malformed JSON.");
  }

  if (payload.IsErroredOnProcessing) {
    const message = Array.isArray(payload.ErrorMessage)
      ? payload.ErrorMessage.join(", ")
      : payload.ErrorMessage || payload.ErrorDetails || "OCR processing failed.";
    throw new OCRSpaceError(message);
  }

  return payload;
}

import { NextResponse } from "next/server";

import { normalizeReceipt } from "../../../lib/ocr/normalizeReceipt";
import { OCRSpaceError, parseReceiptWithOCRSpace } from "../../../lib/ocr/ocrSpace";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(request: Request) {
  try {
    if (!process.env.OCR_SPACE_API_KEY) {
      return NextResponse.json(
        { message: "OCR receipt scanning is not configured on the server." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Please upload one receipt image." }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Please upload a JPG, PNG, WEBP, HEIC, or HEIF image." },
        { status: 400 }
      );
    }

    const rawResponse = await parseReceiptWithOCRSpace(file);
    const receipt = normalizeReceipt(rawResponse);

    return NextResponse.json({ receipt });
  } catch (error) {
    if (error instanceof OCRSpaceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Receipt scanning failed unexpectedly." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { parseReceiptWithLava } from "../../../lib/ocr/parseReceiptWithAI";

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
    if (!process.env.LAVA_API_KEY) {
      return NextResponse.json(
        { message: "Receipt scanning is not configured on the server." },
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

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const ai = await parseReceiptWithLava(base64, file.type);

    if (!ai) {
      return NextResponse.json(
        { message: "Could not extract data from the receipt. Please try a clearer photo." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      receipt: {
        merchantName: ai.merchantName,
        purchaseDate: ai.purchaseDate,
        total: ai.total,
        subtotal: ai.subtotal,
        fees: ai.fees > 0 ? ai.fees : undefined,
        items: ai.items.length > 0 ? ai.items : undefined,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Receipt scanning failed unexpectedly." }, { status: 500 });
  }
}

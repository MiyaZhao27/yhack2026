import { NormalizedReceipt, ReceiptLineItem } from "./normalizeReceipt";

interface AIReceiptResult {
  merchantName?: string;
  purchaseDate?: string;
  total?: number;
  subtotal?: number;
  fees: number;
  items: ReceiptLineItem[];
}

const shouldDebugReceiptAI = process.env.RECEIPT_AI_DEBUG === "1";

export async function parseReceiptWithLava(
  imageBase64: string,
  mimeType: string
): Promise<AIReceiptResult | null> {
  const apiKey = process.env.LAVA_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.lava.so/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: `You are a receipt parser. Carefully read every line of this receipt image and extract structured data. Return ONLY valid JSON with no markdown, no explanation.

Fields to extract:
- "merchantName": the store or restaurant name (string or null)
- "purchaseDate": the purchase date in YYYY-MM-DD format (string or null)
- "total": the final grand total dollar amount charged (number or null)
- "subtotal": the subtotal before tax/fees (number or null)
- "fees": the SUM of ALL add-on charges that are NOT the core purchased product. This includes: sales tax, tax, HST, GST, VAT, tip, gratuity, service fee, service charge, booking fee, surcharge (any kind), delivery fee, congestion charge, accessibility charge, administrative charge, and any government-mandated fees. If a line shows a percentage rate like "7.5%" followed by a dollar amount, include that dollar amount. Sum ALL such lines into one number.
- "items": array of the core purchased products/services AND discounts ONLY. Rules:
  - Each item: "name" = the actual product/dish/service name (NOT the price), "amount" = the final line total (quantity × unit price).
  - Discounts, coupons, vouchers, savings, and promo codes are items with a NEGATIVE amount (e.g. {"name":"Coupon","amount":-2.00}).
  - IMPORTANT: Do NOT put anything in both "items" AND "fees". Every line belongs to exactly one bucket.
  - Do NOT include in "items": subtotal, total, balance due, change, tax, tip, any surcharge, any fee, or payment method lines.

Respond with this exact JSON structure:
{"merchantName":null,"purchaseDate":null,"total":null,"subtotal":null,"fees":0,"items":[{"name":"product name","amount":0.00},{"name":"Coupon","amount":-2.00}]}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Lava] API error", response.status, errText);
    return null;
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string; reasoning_content?: string } }[];
  };
  if (shouldDebugReceiptAI) {
    console.log("[Lava] full data:", JSON.stringify(data, null, 2));
  }
  const text =
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.message?.reasoning_content ||
    "";
  if (shouldDebugReceiptAI) {
    console.log("[Lava] raw response:", text);
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Lava] no JSON found in response");
    return null;
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<AIReceiptResult>;
  if (shouldDebugReceiptAI) {
    console.log("[Lava] parsed:", JSON.stringify(parsed, null, 2));
  }

  const items: ReceiptLineItem[] = (parsed.items ?? [])
    .filter((item) => item.name && typeof item.amount === "number" && item.amount !== 0)
    .map((item) => ({
      name: String(item.name).trim(),
      amount: Number(item.amount.toFixed(2)),
    }));

  return {
    merchantName: parsed.merchantName || undefined,
    purchaseDate: parsed.purchaseDate || undefined,
    total: typeof parsed.total === "number" && parsed.total > 0 ? parsed.total : undefined,
    subtotal: typeof parsed.subtotal === "number" && parsed.subtotal > 0 ? parsed.subtotal : undefined,
    fees: typeof parsed.fees === "number" && parsed.fees > 0 ? Number(parsed.fees.toFixed(2)) : 0,
    items,
  };
}

export function mergeAIResult(
  base: NormalizedReceipt,
  ai: AIReceiptResult
): NormalizedReceipt {
  return {
    ...base,
    merchantName: ai.merchantName ?? base.merchantName,
    purchaseDate: ai.purchaseDate ?? base.purchaseDate,
    total: ai.total ?? base.total,
    subtotal: ai.subtotal ?? base.subtotal,
    fees: ai.fees > 0 ? ai.fees : base.fees,
    items: ai.items.length > 0 ? ai.items : base.items,
  };
}

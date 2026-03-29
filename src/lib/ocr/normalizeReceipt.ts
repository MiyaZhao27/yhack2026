import { OCRSpaceResponse } from "./ocrSpace";

export interface ReceiptLineItem {
  name: string;
  amount: number;
}

export interface NormalizedReceipt {
  merchantName?: string;
  purchaseDate?: string;
  total?: number;
  subtotal?: number;
  fees?: number;
  items?: ReceiptLineItem[];
  rawText?: string;
}

function parseMoney(raw: string) {
  const amount = Number.parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : undefined;
}

function extractMoneyFromLine(line: string) {
  const matches = line.match(/\$?\s?\d{1,4}(?:[.,]\d{3})*(?:[.,]\d{2})/g);
  if (!matches?.length) return undefined;
  return parseMoney(matches[matches.length - 1]);
}

function getLines(payload: OCRSpaceResponse) {
  const parsedText = payload.ParsedResults?.map((result) => result.ParsedText?.trim() || "")
    .filter(Boolean)
    .join("\n");

  if (parsedText) {
    return parsedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return (
    payload.ParsedResults?.flatMap(
      (result) =>
        result.TextOverlay?.Lines?.map(
          (line) =>
            line.LineText?.trim() ||
            line.Words?.map((word) => word.WordText || "").join(" ").trim() ||
            ""
        ) || []
    ) || []
  )
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeDate(raw: string) {
  const iso = raw.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const us = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!us) return undefined;
  const [, month, day, yearToken] = us;
  const year = yearToken.length === 2 ? `20${yearToken}` : yearToken;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function findDate(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/);
    if (!match) continue;
    const normalized = normalizeDate(match[0]);
    if (normalized) return normalized;
  }

  return undefined;
}

function findMerchant(lines: string[]) {
  return lines.find(
    (line) =>
      !/\b(total|subtotal|tax|change|cash|visa|mastercard|receipt|invoice|date)\b/i.test(line)
  );
}

function findLabeledAmount(lines: string[], pattern: RegExp) {
  for (const line of [...lines].reverse()) {
    if (!pattern.test(line)) continue;
    const amount = extractMoneyFromLine(line);
    if (amount !== undefined) return amount;
  }

  return undefined;
}

const FEE_KEYWORD_RE =
  /\b(tax|sales tax|hst|gst|vat|tip|gratuity|service fee|service charge|surcharge|delivery fee)\b/i;

// Matches a standalone percentage rate line like "7.5000 %" or "8.875%"
const PERCENTAGE_LINE_RE = /^\d+\.?\d*\s*%$/;

const ITEM_SKIP_RE =
  /\b(total|subtotal|grand total|amount due|balance due|change|cash|visa|mastercard|receipt|invoice|date|discount|savings|tax|sales tax|hst|gst|vat|tip|gratuity|service fee|service charge|surcharge|delivery fee)\b/i;

function findLineItems(lines: string[]): ReceiptLineItem[] {
  const items: ReceiptLineItem[] = [];

  for (const line of lines) {
    if (ITEM_SKIP_RE.test(line)) continue;

    const amount = extractMoneyFromLine(line);
    if (amount === undefined || amount <= 0) continue;

    // Strip the trailing price from the line to get the item name
    const name = line
      .replace(/\$?\s?\d{1,4}(?:[.,]\d{3})*(?:[.,]\d{2})\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!name || name.length < 2) continue;
    // Skip lines that are only digits/punctuation after stripping
    if (/^[\d\s.,$/-]+$/.test(name)) continue;
    // Skip lines where the name is just a percentage rate (e.g. "7.5000 %")
    if (PERCENTAGE_LINE_RE.test(name)) continue;

    items.push({ name, amount });
  }

  return items;
}

function findFees(lines: string[]): number | undefined {
  let total = 0;
  for (const line of lines) {
    if (!FEE_KEYWORD_RE.test(line)) continue;
    const amount = extractMoneyFromLine(line);
    if (amount !== undefined && amount > 0) total += amount;
  }
  return total > 0 ? Number(total.toFixed(2)) : undefined;
}

function findLargestAmount(lines: string[]) {
  const amounts = lines
    .map((line) => extractMoneyFromLine(line))
    .filter((amount): amount is number => amount !== undefined);

  if (!amounts.length) return undefined;
  return Number(Math.max(...amounts).toFixed(2));
}

export function normalizeReceipt(payload: OCRSpaceResponse): NormalizedReceipt {
  const lines = getLines(payload);
  const rawText = lines.join("\n");

  if (!rawText.trim()) {
    throw new Error("No readable text was returned from OCR.");
  }

  const items = findLineItems(lines);

  return {
    merchantName: findMerchant(lines),
    purchaseDate: findDate(lines),
    total:
      findLabeledAmount(lines, /\b(?:total|amount due|grand total|balance due)\b/i) ||
      findLargestAmount(lines),
    subtotal: findLabeledAmount(lines, /\bsubtotal\b/i),
    fees: findFees(lines),
    items: items.length > 0 ? items : undefined,
    rawText,
  };
}

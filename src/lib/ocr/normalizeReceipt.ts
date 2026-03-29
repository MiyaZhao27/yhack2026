import { OCRSpaceResponse } from "./ocrSpace";

export interface NormalizedReceipt {
  merchantName?: string;
  purchaseDate?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
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

  return {
    merchantName: findMerchant(lines),
    purchaseDate: findDate(lines),
    total:
      findLabeledAmount(lines, /\b(?:total|amount due|grand total|balance due)\b/i) ||
      findLargestAmount(lines),
    subtotal: findLabeledAmount(lines, /\bsubtotal\b/i),
    tax: findLabeledAmount(lines, /\b(?:tax|sales tax)\b/i),
    rawText,
  };
}

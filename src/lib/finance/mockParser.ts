// Mock receipt parser — replace with real OCR (e.g. Google Vision, AWS Textract, Mindee)
// The interface: accepts a File, returns parsed line items.

export interface ParsedReceiptItem {
  name: string;
  amount: number;
}

export async function parseReceipt(file: File): Promise<ParsedReceiptItem[]> {
  // Simulate async OCR latency
  await new Promise((resolve) => setTimeout(resolve, 900));

  // Return mock items. In production, send `file` to your OCR service
  // and parse the response into this same shape.
  void file; // suppress unused warning
  return [
    { name: "Milk", amount: 4.0 },
    { name: "Protein bar", amount: 3.0 },
    { name: "Ice cream", amount: 6.0 },
  ];
}

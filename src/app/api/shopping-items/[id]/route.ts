import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { ShoppingItem } from "../../../../server/models/ShoppingItem";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const item = await ShoppingItem.findByIdAndUpdate(id, await request.json(), { new: true });
  return NextResponse.json(item);
}

import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { ShoppingItem } from "../../../server/models/ShoppingItem";

export async function GET(request: NextRequest) {
  await connectDatabase();

  const suiteId = request.nextUrl.searchParams.get("suiteId");
  const items = (await ShoppingItem.find(suiteId ? { suiteId } : {})
    .sort({ createdAt: -1 })
    .lean()) as any[];

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const item = await ShoppingItem.create(await request.json());
  return NextResponse.json(item, { status: 201 });
}

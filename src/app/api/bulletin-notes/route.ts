import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../server/config/db";
import { BulletinNote } from "../../../server/models/BulletinNote";
import { getSessionUserContext } from "../../../server/utils/sessionUser";

export async function GET(request: NextRequest) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const suiteId = request.nextUrl.searchParams.get("suiteId");
  if (!suiteId || suiteId !== currentUser.suiteId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const notes = await BulletinNote.find({ suiteId }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  await connectDatabase();

  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  if (String(payload.suiteId) !== currentUser.suiteId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const note = await BulletinNote.create({
    suiteId: currentUser.suiteId,
    color: payload.color,
    text: payload.text ?? "New note",
    x: Number(payload.x ?? 0),
    y: Number(payload.y ?? 0),
    rotationDeg: Number(payload.rotationDeg ?? 0),
  });

  return NextResponse.json(note, { status: 201 });
}

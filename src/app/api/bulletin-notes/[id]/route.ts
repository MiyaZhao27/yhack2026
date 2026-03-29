import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "../../../../auth";
import { connectDatabase } from "../../../../server/config/db";
import { BulletinNote } from "../../../../server/models/BulletinNote";

async function getAuthorizedNote(id: string) {
  const session = await getServerSession(authOptions);
  const sessionSuiteId = session?.user?.suiteId ? String(session.user.suiteId) : "";
  if (!sessionSuiteId) {
    return { sessionSuiteId, note: null, unauthorized: true };
  }

  const note = await BulletinNote.findById(id);
  if (!note) {
    return { sessionSuiteId, note: null, unauthorized: false };
  }

  if (String(note.suiteId) !== sessionSuiteId) {
    return { sessionSuiteId, note: null, unauthorized: true };
  }

  return { sessionSuiteId, note, unauthorized: false };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const { note, unauthorized } = await getAuthorizedNote(id);
  if (unauthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (!note) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const payload = await request.json();
  note.color = payload.color ?? note.color;
  note.text = typeof payload.text === "string" ? payload.text : note.text;
  note.x = typeof payload.x === "number" ? payload.x : note.x;
  note.y = typeof payload.y === "number" ? payload.y : note.y;
  note.rotationDeg =
    typeof payload.rotationDeg === "number" ? payload.rotationDeg : note.rotationDeg;
  await note.save();

  return NextResponse.json(note);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDatabase();

  const { id } = await context.params;
  const { note, unauthorized } = await getAuthorizedNote(id);
  if (unauthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (!note) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await note.deleteOne();
  return NextResponse.json({ success: true });
}

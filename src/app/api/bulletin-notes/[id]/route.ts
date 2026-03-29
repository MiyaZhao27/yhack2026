import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "../../../../server/config/db";
import { BulletinNote } from "../../../../server/models/BulletinNote";
import { getSessionUserContext } from "../../../../server/utils/sessionUser";
import { userHasSuiteAccess } from "../../../../server/utils/suiteMembership";

async function getAuthorizedNote(id: string) {
  const currentUser = await getSessionUserContext();
  if (!currentUser) {
    return { note: null, unauthorized: true };
  }

  const note = await BulletinNote.findById(id);
  if (!note) {
    return { note: null, unauthorized: false };
  }

  if (!userHasSuiteAccess(currentUser, String(note.suiteId))) {
    return { note: null, unauthorized: true };
  }

  return { note, unauthorized: false };
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

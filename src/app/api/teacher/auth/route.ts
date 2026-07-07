import { NextResponse } from "next/server";
import { checkTeacherPin } from "../../_lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: { code: "not_implemented", message: "analyze is not implemented yet" } },
    { status: 501 },
  );
}

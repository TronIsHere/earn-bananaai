import { NextRequest, NextResponse } from "next/server";
import { listUserLedger } from "@/lib/earn-ledger";
import { requireSession } from "@/lib/session";
import { mongoIdSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  const beforeParam = request.nextUrl.searchParams.get("before");
  let before: string | null = null;
  if (beforeParam) {
    const parsed = mongoIdSchema.safeParse(beforeParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }
    before = parsed.data;
  }

  try {
    const page = await listUserLedger(session.user.id, { before });
    return NextResponse.json(page);
  } catch (error) {
    console.error("Error listing ledger:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

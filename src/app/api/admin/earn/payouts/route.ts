import { NextRequest, NextResponse } from "next/server";
import { EARN_PAYOUT_STATUSES } from "@/lib/earn";
import { PayoutError, listAdminPayouts } from "@/lib/earn-payouts";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  const statusParam = request.nextUrl.searchParams.get("status") || "pending";
  const allowed = new Set<string>(["all", ...EARN_PAYOUT_STATUSES]);
  if (!allowed.has(statusParam)) {
    return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  }

  try {
    const payouts = await listAdminPayouts(
      statusParam === "all" ? "all" : statusParam
    );
    return NextResponse.json({ payouts });
  } catch (error) {
    if (error instanceof PayoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error listing admin payouts:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

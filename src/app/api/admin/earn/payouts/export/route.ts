import { NextRequest, NextResponse } from "next/server";
import { EARN_PAYOUT_STATUSES } from "@/lib/earn";
import { listAdminPayouts } from "@/lib/earn-payouts";
import { buildPayoutsCsv } from "@/lib/earn-payouts-csv";
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

  const status = request.nextUrl.searchParams.get("status") || "pending";
  const allowed = new Set<string>(["all", ...EARN_PAYOUT_STATUSES]);
  if (!allowed.has(status)) {
    return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  }

  try {
    const payouts = await listAdminPayouts(status);
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(buildPayoutsCsv(payouts), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payouts-${status}-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting payouts:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

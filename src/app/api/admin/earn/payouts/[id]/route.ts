import { NextRequest, NextResponse } from "next/server";
import { PayoutError, reviewEarnPayout } from "@/lib/earn-payouts";
import { requireAdmin } from "@/lib/session";
import { mongoIdSchema, payoutDecisionSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  const { id } = await context.params;
  const idParsed = mongoIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "شناسه درخواست نامعتبر است" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }

  const parsed = payoutDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "درخواست نامعتبر است" },
      { status: 400 }
    );
  }

  try {
    const result = await reviewEarnPayout({
      payoutId: idParsed.data,
      reviewerId: auth.session.user.id,
      decision: parsed.data.decision,
      note: parsed.data.note,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PayoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error reviewing payout:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

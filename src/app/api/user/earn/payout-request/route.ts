import { NextRequest, NextResponse } from "next/server";
import {
  PayoutError,
  listUserPayouts,
  requestEarnPayout,
} from "@/lib/earn-payouts";
import { requireSession } from "@/lib/session";
import { payoutRequestSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  try {
    const payouts = await listUserPayouts(session.user.id);
    return NextResponse.json({ payouts });
  } catch (error) {
    console.error("Error listing payouts:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }

  const parsed = payoutRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "درخواست نامعتبر است" },
      { status: 400 }
    );
  }

  try {
    const result = await requestEarnPayout({
      userId: session.user.id,
      amount: parsed.data.amount,
      bankNote: parsed.data.bankNote,
    });
    return NextResponse.json({
      success: true,
      message: "درخواست واریز ثبت شد و پس از بررسی دستی پرداخت می‌شود.",
      ...result,
    });
  } catch (error) {
    if (error instanceof PayoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error creating payout request:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

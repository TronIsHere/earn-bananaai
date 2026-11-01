import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { requireSession } from "@/lib/session";
import User from "@/models/user";

const bodySchema = z.object({ enabled: z.boolean() });

/** Turns the one-shot "text me when a new campaign opens" request on or off. */
export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  }
  if (!user.earnCampaignSmsEligible) {
    return NextResponse.json(
      { error: "اطلاع‌رسانی پیامکی برای حساب تو فعال نیست." },
      { status: 403 }
    );
  }

  user.earnCampaignSmsOptIn = parsed.data.enabled;
  await user.save();

  return NextResponse.json({ campaignSmsOptIn: user.earnCampaignSmsOptIn });
}

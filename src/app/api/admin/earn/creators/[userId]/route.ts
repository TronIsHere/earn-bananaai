import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/session";
import { mongoIdSchema } from "@/lib/validations";
import User from "@/models/user";

const patchSchema = z.object({ campaignSmsEligible: z.boolean() });

/** Marks or unmarks a creator for new-campaign SMS alerts. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  const { userId } = await context.params;
  const idParsed = mongoIdSchema.safeParse(userId);
  if (!idParsed.success) {
    return NextResponse.json({ error: "شناسه کاربر نامعتبر است" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  await connectDB();
  const eligible = parsed.data.campaignSmsEligible;
  const user = await User.findByIdAndUpdate(
    idParsed.data,
    {
      $set: {
        earnCampaignSmsEligible: eligible,
        // Unmarking also drops a pending request so nobody gets texted later.
        ...(eligible ? {} : { earnCampaignSmsOptIn: false }),
      },
    },
    { new: true, projection: { earnCampaignSmsEligible: 1, earnCampaignSmsOptIn: 1 } }
  ).lean();
  if (!user) {
    return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  }

  return NextResponse.json({
    userId: user._id.toString(),
    campaignSmsEligible: Boolean(user.earnCampaignSmsEligible),
    campaignSmsOptIn: Boolean(user.earnCampaignSmsOptIn),
  });
}

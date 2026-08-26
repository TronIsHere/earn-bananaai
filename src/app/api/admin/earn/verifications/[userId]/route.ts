import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toVerificationDto } from "@/lib/earn-verification";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/session";
import { mongoIdSchema } from "@/lib/validations";
import User from "@/models/user";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    decision: z.literal("reject"),
    note: z
      .string()
      .trim()
      .min(3, "دلیل رد کردن را بنویسید")
      .max(500, "دلیل رد کردن خیلی طولانی است"),
  }),
]);

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

  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "درخواست نامعتبر است" },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(idParsed.data);
  if (!user) {
    return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  }

  if (!user.earnInstagramHandle || !user.earnVerificationCode) {
    return NextResponse.json(
      { error: "این کاربر هنوز کد بیو نگرفته است." },
      { status: 400 }
    );
  }

  if (user.earnVerificationStatus !== "pending") {
    return NextResponse.json(
      { error: "فقط درخواست‌های در انتظار بررسی قابل تأیید یا رد هستند." },
      { status: 400 }
    );
  }

  if (parsed.data.decision === "approve") {
    user.earnVerificationStatus = "verified";
    user.earnVerifiedAt = new Date();
    user.earnVerificationNote = parsed.data.note?.trim() || null;
  } else {
    user.earnVerificationStatus = "rejected";
    user.earnVerifiedAt = null;
    user.earnVerificationNote = parsed.data.note.trim();
  }

  await user.save();

  return NextResponse.json({
    userId: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    mobileNumber: user.mobileNumber,
    ...toVerificationDto(user),
  });
}

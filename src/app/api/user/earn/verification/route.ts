import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toVerificationDto } from "@/lib/earn-verification";
import connectDB, { isMongoDuplicateKey } from "@/lib/mongodb";
import { requireSession, publicUser } from "@/lib/session";
import { instagramHandleSchema } from "@/lib/validations";
import { generateVerificationCode } from "@/lib/verification-code";
import User from "@/models/user";

const HANDLE_TAKEN = "این نام کاربری اینستاگرام قبلاً برای حساب دیگری ثبت شده است.";

const startSchema = z.object({
  action: z.literal("start"),
  handle: instagramHandleSchema,
});

const requestReviewSchema = z.object({
  action: z.literal("request_review"),
});

const bodySchema = z.discriminatedUnion("action", [
  startSchema,
  requestReviewSchema,
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function loadCurrentUser(userId: string) {
  await connectDB();
  return User.findById(userId);
}

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("وارد شوید", 401);

  const user = await loadCurrentUser(session.user.id);
  if (!user) return jsonError("کاربر پیدا نشد", 404);

  return NextResponse.json({
    ...publicUser(user),
    verification: toVerificationDto(user),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return jsonError("وارد شوید", 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("بدنه درخواست نامعتبر است", 400);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "درخواست نامعتبر است", 400);
  }

  const user = await loadCurrentUser(session.user.id);
  if (!user) return jsonError("کاربر پیدا نشد", 404);

  try {
    if (parsed.data.action === "start") {
      const handle = parsed.data.handle;

      if (user.earnInstagramHandle === handle && user.earnVerificationCode) {
        return NextResponse.json({
          ...publicUser(user),
          verification: toVerificationDto(user),
        });
      }

      const taken = await User.exists({
        earnInstagramHandle: handle,
        _id: { $ne: user._id },
      });
      if (taken) return jsonError(HANDLE_TAKEN, 409);

      user.earnInstagramHandle = handle;
      user.earnVerificationCode = generateVerificationCode();
      user.earnVerificationStatus = "none";
      user.earnVerifiedAt = null;
      user.earnVerificationRequestedAt = null;
      user.earnVerificationNote = null;
      await user.save();
    } else {
      if (!user.earnInstagramHandle || !user.earnVerificationCode) {
        return jsonError("اول نام کاربری را وارد کن تا کد بیو بگیری.", 400);
      }
      if (user.earnVerificationStatus === "verified") {
        return jsonError("حساب اینستاگرام قبلاً تأیید شده است.", 400);
      }
      if (user.earnVerificationStatus !== "pending") {
        user.earnVerificationStatus = "pending";
        user.earnVerificationNote = null;
        user.earnVerificationRequestedAt = new Date();
        await user.save();
      }
    }
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return jsonError(HANDLE_TAKEN, 409);
    }
    console.error("Error updating Instagram verification:", error);
    return jsonError("خطای داخلی سرور", 500);
  }

  return NextResponse.json({
    ...publicUser(user),
    verification: toVerificationDto(user),
  });
}

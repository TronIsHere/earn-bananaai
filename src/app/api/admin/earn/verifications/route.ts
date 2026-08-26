import { NextRequest, NextResponse } from "next/server";
import {
  EARN_VERIFICATION_STATUSES,
  type EarnVerificationStatus,
} from "@/lib/earn";
import { toVerificationDto } from "@/lib/earn-verification";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/session";
import User from "@/models/user";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  const statusParam = request.nextUrl.searchParams.get("status") || "pending";
  const allowed = new Set<string>(["all", ...EARN_VERIFICATION_STATUSES]);
  if (!allowed.has(statusParam)) {
    return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  }

  await connectDB();

  const query =
    statusParam === "all"
      ? User.find({ earnInstagramHandle: { $gt: "" } })
      : User.find({
          earnVerificationStatus: statusParam as EarnVerificationStatus,
        });

  const oldestFirst = statusParam === "pending";
  const users = await query
    .select(
      "firstName lastName mobileNumber earnInstagramHandle earnVerificationCode earnVerificationStatus earnVerificationNote earnVerifiedAt earnVerificationRequestedAt updatedAt createdAt"
    )
    .sort(
      oldestFirst
        ? { earnVerificationRequestedAt: 1, updatedAt: 1 }
        : { updatedAt: -1 }
    )
    .limit(200)
    .lean();

  return NextResponse.json({
    verifications: users.map((user) => ({
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      mobileNumber: user.mobileNumber,
      updatedAt: user.updatedAt.toISOString(),
      ...toVerificationDto(user),
    })),
  });
}

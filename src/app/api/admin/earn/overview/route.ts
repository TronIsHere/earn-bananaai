import { NextResponse } from "next/server";
import type { AdminOverviewJson } from "@/lib/admin-overview-types";
import {
  DAY7_ELIGIBLE_STATUSES,
  REVIEW_SLA_DUE_SOON_HOURS,
  REVIEW_SLA_HOURS,
} from "@/lib/earn";
import connectDB from "@/lib/mongodb";
import { requireAdmin } from "@/lib/session";
import EarnCampaign from "@/models/earn-campaign";
import EarnPayout from "@/models/earn-payout";
import EarnSubmission from "@/models/earn-submission";
import User from "@/models/user";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  try {
    await connectDB();
    const now = new Date();
    const slaCutoff = new Date(now.getTime() - REVIEW_SLA_HOURS * HOUR_MS);
    const dueSoonAt = new Date(
      now.getTime() + REVIEW_SLA_DUE_SOON_HOURS * HOUR_MS
    );

    const [
      verificationsPending,
      verificationsOverdue,
      reviewPending,
      reviewOverdue,
      reviewDueSoon,
      day7Waiting,
      day7WithInsights,
      payoutsPending,
      payoutsOverdue,
      payoutAgg,
      campaignAgg,
    ] = await Promise.all([
      User.countDocuments({ earnVerificationStatus: "pending" }),
      User.countDocuments({
        earnVerificationStatus: "pending",
        $or: [
          { earnVerificationRequestedAt: { $lt: slaCutoff } },
          { earnVerificationRequestedAt: null, updatedAt: { $lt: slaCutoff } },
        ],
      }),
      EarnSubmission.countDocuments({ status: "pending" }),
      // Legacy rows without reviewDueAt fall back to the default SLA.
      EarnSubmission.countDocuments({
        status: "pending",
        $or: [
          { reviewDueAt: { $lt: now } },
          { reviewDueAt: null, createdAt: { $lt: slaCutoff } },
        ],
      }),
      EarnSubmission.countDocuments({
        status: "pending",
        reviewDueAt: { $gte: now, $lt: dueSoonAt },
      }),
      EarnSubmission.countDocuments({
        status: { $in: DAY7_ELIGIBLE_STATUSES },
      }),
      EarnSubmission.countDocuments({
        status: { $in: DAY7_ELIGIBLE_STATUSES },
        day7ProofSubmittedAt: { $ne: null },
      }),
      EarnPayout.countDocuments({ status: "pending" }),
      EarnPayout.countDocuments({
        status: "pending",
        createdAt: { $lt: slaCutoff },
      }),
      EarnPayout.aggregate<{ total: number }>([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      EarnCampaign.aggregate<{
        _id: string;
        count: number;
        total: number;
        spent: number;
      }>([
        { $match: { status: { $in: ["active", "draft"] } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$totalBudgetToman" },
            spent: { $sum: "$spentBudgetToman" },
          },
        },
      ]),
    ]);

    const active = campaignAgg.find((row) => row._id === "active");
    const draft = campaignAgg.find((row) => row._id === "draft");

    const overview: AdminOverviewJson = {
      verifications: {
        pending: verificationsPending,
        overdue: verificationsOverdue,
      },
      review: {
        pending: reviewPending,
        overdue: reviewOverdue,
        dueSoon: reviewDueSoon,
      },
      day7: { waiting: day7Waiting, withInsights: day7WithInsights },
      payouts: {
        pending: payoutsPending,
        overdue: payoutsOverdue,
        pendingAmount: payoutAgg[0]?.total ?? 0,
      },
      campaigns: {
        active: active?.count ?? 0,
        draft: draft?.count ?? 0,
        totalBudgetToman: active?.total ?? 0,
        spentBudgetToman: active?.spent ?? 0,
      },
      generatedAt: now.toISOString(),
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error building admin overview:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

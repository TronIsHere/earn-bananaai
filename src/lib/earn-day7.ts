import "server-only";
import mongoose, { type Types } from "mongoose";
import {
  computeViewBonusToman,
  creatorLevelForPaidReels,
  creatorMaxPayoutPerVideoToman,
  creatorViewBonusTiers,
  DAY7_ELIGIBLE_STATUSES,
  EARN_SUBMISSION_STATUSES,
  matchViewBonusTier,
  REVIEW_SLA_HOURS,
  sumReachedViewBonusToman,
  viewBonusRemainingCap,
  type EarnSubmissionStatus,
} from "@/lib/earn";
import {
  creditEarnWallet,
  EarnWalletError,
} from "@/lib/earn-wallet";
import { getCreatorLevel, getPaidReelCounts } from "@/lib/earn-creator-level";
import connectDB from "@/lib/mongodb";
import type {
  AdminSubmissionJson,
  AdminSubmissionCampaignJson,
  AdminSubmissionUserJson,
} from "@/lib/earn-submissions-types";
import type { ViewBonusTier } from "@/lib/types";
import EarnCampaign from "@/models/earn-campaign";
import EarnSubmission from "@/models/earn-submission";

export type {
  AdminSubmissionJson,
  AdminSubmissionCampaignJson,
  AdminSubmissionUserJson,
};

export type Day7ErrorCode =
  | "INVALID_ID"
  | "INVALID_VIEWS"
  | "SUBMISSION_NOT_FOUND"
  | "CAMPAIGN_NOT_FOUND"
  | "NOT_ELIGIBLE"
  | "ALREADY_FINALIZED"
  | "BUDGET_EXCEEDED"
  | "USER_NOT_FOUND";

export class Day7Error extends Error {
  constructor(
    message: string,
    public readonly code: Day7ErrorCode,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "Day7Error";
  }
}

type PopulatedUser = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  earnInstagramHandle?: string | null;
  mobileNumber: string;
};

type PopulatedCampaign = {
  _id: Types.ObjectId;
  title: string;
  viewBonusTiers?: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  spentBudgetToman: number;
  totalBudgetToman: number;
};

export type AdminSubmissionDoc = {
  _id: Types.ObjectId;
  status: EarnSubmissionStatus;
  instagramPostUrl: string;
  proofScreenshotUrl: string;
  reviewerNote: string | null;
  resubmitCount?: number;
  resubmittedAt?: Date | string | null;
  reviewSlaHours?: number | null;
  basePayoutToman: number;
  bonusToman: number;
  day7Views: number | null;
  day7ClaimedViews?: number | null;
  day7ProofScreenshotUrl?: string | null;
  day7ProofSubmittedAt?: Date | string | null;
  basePaidAt: Date | string | null;
  bonusPaidAt: Date | string | null;
  finalizedAt: Date | string | null;
  featuredAt?: Date | string | null;
  createdAt: Date | string;
  userId: unknown;
  campaignId: unknown;
};

const ADMIN_POPULATE = [
  {
    path: "campaignId",
    select:
      "title viewBonusTiers maxPayoutPerVideoToman spentBudgetToman totalBudgetToman",
  },
  {
    path: "userId",
    select: "firstName lastName earnInstagramHandle mobileNumber",
  },
];

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isPopulatedUser(value: unknown): value is PopulatedUser {
  return Boolean(
    value &&
      typeof value === "object" &&
      "firstName" in value &&
      "_id" in value
  );
}

function isPopulatedCampaign(value: unknown): value is PopulatedCampaign {
  return Boolean(
    value && typeof value === "object" && "title" in value && "_id" in value
  );
}

export function serializeAdminSubmission(
  doc: AdminSubmissionDoc,
  paidReelsByUser: Map<string, number> = new Map()
): AdminSubmissionJson {
  const paidReels = isPopulatedUser(doc.userId)
    ? (paidReelsByUser.get(doc.userId._id.toString()) ?? 0)
    : 0;
  const user = isPopulatedUser(doc.userId)
    ? {
        id: doc.userId._id.toString(),
        firstName: doc.userId.firstName,
        lastName: doc.userId.lastName,
        instagramHandle: doc.userId.earnInstagramHandle ?? null,
        mobileNumber: doc.userId.mobileNumber,
        creatorLevel: creatorLevelForPaidReels(paidReels).id,
        paidReels,
      }
    : null;

  const campaign = isPopulatedCampaign(doc.campaignId)
    ? {
        id: doc.campaignId._id.toString(),
        title: doc.campaignId.title,
        viewBonusTiers: doc.campaignId.viewBonusTiers ?? [],
        maxPayoutPerVideoToman: doc.campaignId.maxPayoutPerVideoToman,
        spentBudgetToman: doc.campaignId.spentBudgetToman,
        totalBudgetToman: doc.campaignId.totalBudgetToman,
      }
    : null;

  return {
    id: doc._id.toString(),
    status: doc.status,
    instagramPostUrl: doc.instagramPostUrl,
    proofScreenshotUrl: doc.proofScreenshotUrl,
    reviewerNote: doc.reviewerNote,
    resubmitCount: doc.resubmitCount ?? 0,
    basePayoutToman: doc.basePayoutToman,
    bonusToman: doc.bonusToman,
    day7Views: doc.day7Views,
    day7ClaimedViews: doc.day7ClaimedViews ?? null,
    day7ProofScreenshotUrl: doc.day7ProofScreenshotUrl ?? null,
    day7ProofSubmittedAt: toIso(doc.day7ProofSubmittedAt),
    basePaidAt: toIso(doc.basePaidAt),
    bonusPaidAt: toIso(doc.bonusPaidAt),
    finalizedAt: toIso(doc.finalizedAt),
    featuredAt: toIso(doc.featuredAt),
    createdAt: toIso(doc.createdAt) ?? new Date().toISOString(),
    resubmittedAt: toIso(doc.resubmittedAt),
    reviewSlaHours: doc.reviewSlaHours ?? REVIEW_SLA_HOURS,
    user,
    campaign,
  };
}

export function adminSubmissionStatusFilter(
  status: string | null
): Record<string, unknown> | null {
  if (!status || status === "day7") {
    return { status: { $in: DAY7_ELIGIBLE_STATUSES } };
  }
  if (status === "review") {
    return { status: "pending" };
  }
  if (status === "winners") {
    // Paid reels an admin can feature in the campaign gallery.
    return {
      status: "finalized",
      $or: [{ bonusToman: { $gt: 0 } }, { basePayoutToman: { $gt: 0 } }],
    };
  }
  if ((EARN_SUBMISSION_STATUSES as readonly string[]).includes(status)) {
    return { status };
  }
  return null;
}

export async function listAdminSubmissions(
  status: string | null
): Promise<AdminSubmissionJson[]> {
  const filter = adminSubmissionStatusFilter(status);
  if (!filter) {
    throw new Day7Error("وضعیت نامعتبر است", "NOT_ELIGIBLE", 400);
  }

  await connectDB();
  const isReviewQueue = status === "review" || status === "pending";
  // Review queue: closest SLA deadline first, so faster creator levels surface.
  const rows = (await EarnSubmission.find(filter)
    .sort(
      isReviewQueue
        ? { reviewDueAt: 1, updatedAt: 1 }
        : status === "winners"
          ? { bonusToman: -1, finalizedAt: -1 }
          : { basePaidAt: 1, createdAt: 1 }
    )
    .limit(100)
    .populate(ADMIN_POPULATE)
    .lean()) as unknown as AdminSubmissionDoc[];

  const paidReelsByUser = await getPaidReelCounts(
    rows.flatMap((row) => (isPopulatedUser(row.userId) ? [row.userId._id] : []))
  );
  return rows.map((row) => serializeAdminSubmission(row, paidReelsByUser));
}

export async function getAdminSubmissionById(
  id: string
): Promise<AdminSubmissionJson | null> {
  const doc = (await EarnSubmission.findById(id)
    .populate(ADMIN_POPULATE)
    .lean()) as unknown as AdminSubmissionDoc | null;
  if (!doc) return null;
  const paidReelsByUser = await getPaidReelCounts(
    isPopulatedUser(doc.userId) ? [doc.userId._id] : []
  );
  return serializeAdminSubmission(doc, paidReelsByUser);
}

export interface EnterDay7ViewBonusResult {
  submission: AdminSubmissionJson;
  views: number;
  bonusToman: number;
  matchedTier: ViewBonusTier | null;
  remainingCap: number;
  capped: boolean;
  wallet: {
    balance: number;
    lifetimeEarned: number;
    spentBudgetToman: number;
    totalBudgetToman: number;
  } | null;
}

/**
 * Admin enters day-7 views: sum reached tiers (nothing under MIN_PAID_VIEWS),
 * cap by maxPayoutPerVideoToman, both raised by the creator level boost, credit
 * wallet when bonus > 0, finalize.
 */
export async function enterDay7ViewBonus(params: {
  submissionId: string;
  views: number;
  reviewerId?: string;
}): Promise<EnterDay7ViewBonusResult> {
  const { submissionId, views, reviewerId } = params;

  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw new Day7Error("شناسه ارسال نامعتبر است", "INVALID_ID", 400);
  }
  if (!Number.isInteger(views) || views < 0) {
    throw new Day7Error("تعداد بازدید نامعتبر است", "INVALID_VIEWS", 400);
  }

  await connectDB();

  const submission = await EarnSubmission.findById(submissionId);
  if (!submission) {
    throw new Day7Error("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }
  if (submission.status === "finalized" || submission.finalizedAt) {
    throw new Day7Error(
      "پاداش این ارسال قبلاً نهایی شده است",
      "ALREADY_FINALIZED",
      409
    );
  }
  if (!DAY7_ELIGIBLE_STATUSES.includes(submission.status)) {
    throw new Day7Error(
      "این ارسال آماده ثبت بازدید روز ۷ نیست",
      "NOT_ELIGIBLE",
      409
    );
  }

  const campaign = await EarnCampaign.findById(submission.campaignId);
  if (!campaign) {
    throw new Day7Error("کمپین پیدا نشد", "CAMPAIGN_NOT_FOUND", 404);
  }

  // Level at payout time (this reel is not finalized yet, so it is not counted).
  const { level } = await getCreatorLevel(submission.userId);
  const maxPayoutToman = creatorMaxPayoutPerVideoToman(
    campaign.maxPayoutPerVideoToman,
    level
  );

  // Legacy submissions were credited a base on approval; it still counts toward the cap.
  const basePayoutToman = submission.basePayoutToman ?? 0;
  const tiers = creatorViewBonusTiers(campaign.viewBonusTiers ?? [], level);
  const matchedTier = matchViewBonusTier(views, tiers);
  const remainingCap = viewBonusRemainingCap(maxPayoutToman, basePayoutToman);
  const rawBonus = sumReachedViewBonusToman(views, tiers);
  const bonusToman = computeViewBonusToman(
    views,
    tiers,
    maxPayoutToman,
    basePayoutToman
  );

  const claimed = await EarnSubmission.findOneAndUpdate(
    {
      _id: submissionId,
      status: { $in: DAY7_ELIGIBLE_STATUSES },
      finalizedAt: null,
      day7Views: null,
    },
    { $set: { day7Views: views } },
    { new: true }
  );

  if (!claimed) {
    throw new Day7Error(
      "پاداش این ارسال قبلاً نهایی شده است",
      "ALREADY_FINALIZED",
      409
    );
  }

  let wallet: EnterDay7ViewBonusResult["wallet"] = null;
  try {
    if (bonusToman > 0) {
      const credited = await creditEarnWallet({
        userId: claimed.userId,
        campaignId: claimed.campaignId,
        amountToman: bonusToman,
        kind: "bonus",
        ledger: {
          submissionId,
          actorId: reviewerId,
          idempotencyKey: `bonus:${submissionId}`,
        },
      });
      wallet = {
        balance: credited.balance,
        lifetimeEarned: credited.lifetimeEarned,
        spentBudgetToman: credited.spentBudgetToman,
        totalBudgetToman: credited.totalBudgetToman,
      };
    }
  } catch (error) {
    await EarnSubmission.findByIdAndUpdate(submissionId, {
      $set: { day7Views: null },
    });
    if (error instanceof EarnWalletError) {
      if (error.code === "BUDGET_EXCEEDED") {
        throw new Day7Error(
          "بودجه کمپین برای این پاداش کافی نیست",
          "BUDGET_EXCEEDED",
          409
        );
      }
      if (error.code === "USER_NOT_FOUND") {
        throw new Day7Error("کاربر پیدا نشد", "USER_NOT_FOUND", 404);
      }
      if (error.code === "CAMPAIGN_NOT_FOUND") {
        throw new Day7Error("کمپین پیدا نشد", "CAMPAIGN_NOT_FOUND", 404);
      }
    }
    throw error;
  }

  const now = new Date();
  await EarnSubmission.findByIdAndUpdate(submissionId, {
    $set: {
      bonusToman,
      bonusPaidAt: bonusToman > 0 ? now : null,
      status: "finalized",
      finalizedAt: now,
    },
  });

  const serialized = await getAdminSubmissionById(submissionId);
  if (!serialized) {
    throw new Day7Error("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }

  return {
    submission: serialized,
    views,
    bonusToman,
    matchedTier,
    remainingCap,
    capped: rawBonus > remainingCap,
    wallet,
  };
}

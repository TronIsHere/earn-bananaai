import "server-only";
import mongoose, { type Types } from "mongoose";
import {
  debitEarnWallet,
  EarnWalletError,
} from "@/lib/earn-wallet";
import connectDB from "@/lib/mongodb";
import { isOurProofObjectUrl } from "@/lib/s3/client";
import {
  canResubmitSubmission,
  canSubmitDay7Insights,
  day7InsightsOpensAt,
  DAY7_ELIGIBLE_STATUSES,
  EARLY_ACCESS_LEVEL,
  isCampaignLockedForLevel,
  isCampaignOpen,
  MAX_SUBMISSION_RESUBMITS,
  REVIEW_SLA_HOURS,
  reviewDueAt,
  type EarnSubmissionStatus,
} from "@/lib/earn";
import {
  getCreatorLevel,
  type CreatorLevelJson,
} from "@/lib/earn-creator-level";
import {
  activeCampaignMongoFilter,
  serializeCampaign,
} from "@/lib/earn-campaigns";
import { listShowcaseByCampaign } from "@/lib/earn-showcase";
import type {
  UserCampaignJson,
  UserSubmissionJson,
} from "@/lib/earn-submissions-types";
import EarnCampaign, { type IEarnCampaign } from "@/models/earn-campaign";
import EarnSubmission, { type IEarnSubmission } from "@/models/earn-submission";
import User from "@/models/user";
import { formatDate } from "@/lib/utils";

export type SubmissionErrorCode =
  | "UNVERIFIED"
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_INACTIVE"
  | "EARLY_ACCESS"
  | "INVALID_PROOF"
  | "DUPLICATE_URL"
  | "CAP_REACHED"
  | "SUBMISSION_NOT_FOUND"
  | "ALREADY_REVIEWED"
  | "NOT_REVOCABLE"
  | "RESUBMIT_NOT_ALLOWED"
  | "INSIGHTS_NOT_OPEN"
  | "INSIGHTS_NOT_ELIGIBLE"
  | "BUDGET_EXCEEDED"
  | "INSUFFICIENT_BALANCE"
  | "USER_NOT_FOUND";

export class SubmissionError extends Error {
  constructor(
    message: string,
    public readonly code: SubmissionErrorCode,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "SubmissionError";
  }
}

type CampaignLean = IEarnCampaign & { _id: Types.ObjectId };
type SubmissionLean = Omit<IEarnSubmission, "campaignId"> & {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId | CampaignLean;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isPopulatedCampaign(
  value: SubmissionLean["campaignId"]
): value is CampaignLean {
  return Boolean(value && typeof value === "object" && "title" in value);
}

function isDuplicateKey(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

const COUNTED_STATUSES: EarnSubmissionStatus[] = [
  "pending",
  "approved",
  "changes_requested",
  "bonus_pending",
  "finalized",
];

export function serializeUserSubmission(doc: SubmissionLean): UserSubmissionJson {
  const campaignId = isPopulatedCampaign(doc.campaignId)
    ? doc.campaignId._id.toString()
    : doc.campaignId.toString();
  const campaignTitle = isPopulatedCampaign(doc.campaignId)
    ? doc.campaignId.title
    : "";

  return {
    id: doc._id.toString(),
    campaignId,
    campaignTitle,
    platform: "instagram",
    postUrl: doc.instagramPostUrl,
    proofScreenshotUrl: doc.proofScreenshotUrl,
    status: doc.status,
    basePayoutToman: doc.basePayoutToman,
    bonusToman: doc.bonusToman,
    views: doc.day7Views ?? 0,
    reviewerNote: doc.reviewerNote,
    resubmitCount: doc.resubmitCount ?? 0,
    canResubmit: canResubmitSubmission(doc),
    createdAt: toIso(doc.createdAt) ?? new Date().toISOString(),
    resubmittedAt: toIso(doc.resubmittedAt),
    reviewSlaHours: doc.reviewSlaHours ?? REVIEW_SLA_HOURS,
    day7OpensAt: day7InsightsOpensAt(doc.createdAt)?.toISOString() ?? null,
    day7InsightsOpen:
      (day7InsightsOpensAt(doc.createdAt)?.getTime() ?? Infinity) <= Date.now(),
    canSubmitInsights: canSubmitDay7Insights(doc),
    day7ClaimedViews: doc.day7ClaimedViews ?? null,
    day7ProofScreenshotUrl: doc.day7ProofScreenshotUrl ?? null,
    day7ProofSubmittedAt: toIso(doc.day7ProofSubmittedAt),
    reviewedAt: toIso(doc.reviewedAt),
    finalizedAt: toIso(doc.finalizedAt),
  };
}

export async function listUserSubmissionsPage(userId: string): Promise<{
  submissions: UserSubmissionJson[];
  submissionCount: number;
  campaigns: UserCampaignJson[];
  verification: {
    status: string;
    handle: string | null;
  };
  creatorLevel: CreatorLevelJson;
}> {
  await connectDB();

  const user = await User.findById(userId).select(
    "earnVerificationStatus earnInstagramHandle"
  );
  if (!user) {
    throw new SubmissionError("کاربر پیدا نشد", "USER_NOT_FOUND", 404);
  }

  const now = new Date();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [submissions, submissionCount, campaigns, counts, creator] = await Promise.all([
    EarnSubmission.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({ path: "campaignId", select: "title" })
      .lean<SubmissionLean[]>(),
    EarnSubmission.countDocuments({ userId }),
    EarnCampaign.find(activeCampaignMongoFilter(now))
      .sort({ trending: -1, createdAt: -1 })
      .lean<CampaignLean[]>(),
    EarnSubmission.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          userId: userObjectId,
          status: { $in: COUNTED_STATUSES },
        },
      },
      { $group: { _id: "$campaignId", count: { $sum: 1 } } },
    ]),
    getCreatorLevel(userObjectId),
  ]);

  const showcase = await listShowcaseByCampaign(
    campaigns.map((campaign) => campaign._id)
  );
  const countByCampaign = new Map(
    counts.map((row) => [row._id.toString(), row.count])
  );

  return {
    submissions: submissions.map(serializeUserSubmission),
    submissionCount,
    campaigns: campaigns.map((campaign) => {
      const submittedCount = countByCampaign.get(campaign._id.toString()) ?? 0;
      const serialized = serializeCampaign(campaign);
      return {
        ...serialized,
        showcase: showcase.get(campaign._id.toString()) ?? [],
        submittedCount,
        remainingSubmissions: Math.max(
          0,
          campaign.maxSubmissionsPerUser - submittedCount
        ),
      };
    }),
    verification: {
      status: user.earnVerificationStatus,
      handle: user.earnInstagramHandle,
    },
    creatorLevel: { id: creator.level.id, paidReels: creator.paidReels },
  };
}

export async function createEarnSubmission(params: {
  userId: string;
  campaignId: string;
  instagramPostUrl: string;
  proofScreenshotUrl: string;
}): Promise<UserSubmissionJson> {
  const { userId, campaignId, instagramPostUrl, proofScreenshotUrl } = params;
  await connectDB();

  const user = await User.findById(userId).select("earnVerificationStatus");
  if (!user) {
    throw new SubmissionError("کاربر پیدا نشد", "USER_NOT_FOUND", 404);
  }
  if (user.earnVerificationStatus !== "verified") {
    throw new SubmissionError(
      "برای ارسال پست، ابتدا حساب اینستاگرام خود را تأیید کنید.",
      "UNVERIFIED",
      403
    );
  }

  if (!isOurProofObjectUrl(proofScreenshotUrl, userId)) {
    throw new SubmissionError(
      "اسکرین‌شات باید از طریق همین سامانه آپلود شده باشد.",
      "INVALID_PROOF",
      400
    );
  }

  const campaign = await EarnCampaign.findById(campaignId);
  if (!campaign) {
    throw new SubmissionError("کمپین پیدا نشد", "CAMPAIGN_NOT_FOUND", 404);
  }
  if (!isCampaignOpen(campaign)) {
    throw new SubmissionError(
      "این کمپین فعال نیست یا مهلت آن تمام شده است.",
      "CAMPAIGN_INACTIVE",
      400
    );
  }

  const { level } = await getCreatorLevel(userId);
  if (isCampaignLockedForLevel(campaign, level)) {
    throw new SubmissionError(
      `این کمپین فعلاً فقط برای سطح ${EARLY_ACCESS_LEVEL.label} باز است و از ${formatDate(campaign.earlyAccessUntil?.toISOString())} برای همه باز می‌شود.`,
      "EARLY_ACCESS",
      403
    );
  }

  const duplicate = await EarnSubmission.findOne({
    instagramPostUrl,
    status: { $ne: "rejected" },
  }).select("_id");
  if (duplicate) {
    throw new SubmissionError(
      "این لینک پست قبلاً ثبت شده است.",
      "DUPLICATE_URL",
      409
    );
  }

  const usedCount = await EarnSubmission.countDocuments({
    userId,
    campaignId,
    status: { $in: COUNTED_STATUSES },
  });
  if (usedCount >= campaign.maxSubmissionsPerUser) {
    throw new SubmissionError(
      "به سقف تعداد ارسال این کمپین رسیده‌اید.",
      "CAP_REACHED",
      409
    );
  }

  try {
    const created = await EarnSubmission.create({
      userId,
      campaignId,
      instagramPostUrl,
      proofScreenshotUrl,
      status: "pending",
      creatorLevel: level.id,
      reviewSlaHours: level.reviewSlaHours,
      reviewDueAt: reviewDueAt(new Date(), level.reviewSlaHours),
      basePayoutToman: 0,
      bonusToman: 0,
    });

    return serializeUserSubmission({
      ...created.toObject(),
      campaignId: {
        _id: campaign._id,
        title: campaign.title,
      } as CampaignLean,
    } as SubmissionLean);
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new SubmissionError(
        "این لینک پست قبلاً ثبت شده است.",
        "DUPLICATE_URL",
        409
      );
    }
    throw error;
  }
}

export async function approveEarnSubmission(params: {
  submissionId: string;
  reviewerId: string;
}) {
  const { submissionId, reviewerId } = params;
  await connectDB();

  const submission = await EarnSubmission.findById(submissionId);
  if (!submission) {
    throw new SubmissionError("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }
  if (submission.status !== "pending") {
    throw new SubmissionError(
      "این ارسال قبلاً بررسی شده است.",
      "ALREADY_REVIEWED",
      409
    );
  }

  // No payout on approval: money only comes from day-7 views (MIN_PAID_VIEWS+).
  const claimed = await EarnSubmission.findOneAndUpdate(
    { _id: submissionId, status: "pending" },
    {
      $set: {
        status: "bonus_pending",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewerNote: null,
        basePayoutToman: 0,
      },
    },
    { new: true }
  );

  if (!claimed) {
    throw new SubmissionError(
      "این ارسال قبلاً بررسی شده است.",
      "ALREADY_REVIEWED",
      409
    );
  }
}

const REVOCABLE_STATUSES: EarnSubmissionStatus[] = [
  "bonus_pending",
  "approved",
];

/**
 * Undoes approval and returns the submission to the pending review queue.
 * Legacy submissions that were credited a base payout get it clawed back.
 * Not allowed after day-7 finalize.
 */
export async function revokeEarnSubmissionApproval(params: {
  submissionId: string;
  reviewerId: string;
}) {
  const { submissionId, reviewerId } = params;
  await connectDB();

  const submission = await EarnSubmission.findById(submissionId);
  if (!submission) {
    throw new SubmissionError("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }
  if (submission.status === "finalized" || submission.finalizedAt) {
    throw new SubmissionError(
      "ارسال نهایی شده و امکان برگشت تأیید نیست.",
      "NOT_REVOCABLE",
      409
    );
  }
  if (!REVOCABLE_STATUSES.includes(submission.status)) {
    throw new SubmissionError(
      "فقط ارسال‌های تأییدشده (قبل از ثبت بازدید روز ۷) قابل برگشت هستند.",
      "NOT_REVOCABLE",
      409
    );
  }

  const basePayoutToman = submission.basePayoutToman;
  const previousStatus = submission.status;
  const previousReviewedBy = submission.reviewedBy;
  const previousReviewedAt = submission.reviewedAt;
  const previousReviewerNote = submission.reviewerNote;
  const previousBasePaidAt = submission.basePaidAt;

  const claimed = await EarnSubmission.findOneAndUpdate(
    {
      _id: submissionId,
      status: { $in: REVOCABLE_STATUSES },
      finalizedAt: null,
      day7Views: null,
    },
    {
      $set: {
        status: "pending",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewerNote: "تأیید ارسال لغو شد.",
        basePayoutToman: 0,
        basePaidAt: null,
      },
    },
    { new: true }
  );

  if (!claimed) {
    throw new SubmissionError(
      "این ارسال دیگر قابل برگشت نیست.",
      "NOT_REVOCABLE",
      409
    );
  }

  try {
    if (basePayoutToman > 0) {
      await debitEarnWallet({
        userId: claimed.userId,
        campaignId: claimed.campaignId,
        amountToman: basePayoutToman,
        ledger: {
          submissionId,
          actorId: reviewerId,
          note: "تأیید ارسال برگردانده شد",
        },
      });
    }
  } catch (error) {
    await EarnSubmission.findByIdAndUpdate(submissionId, {
      $set: {
        status: previousStatus,
        reviewedBy: previousReviewedBy,
        reviewedAt: previousReviewedAt,
        reviewerNote: previousReviewerNote,
        basePayoutToman,
        basePaidAt: previousBasePaidAt,
      },
    });
    if (error instanceof EarnWalletError) {
      if (error.code === "INSUFFICIENT_BALANCE") {
        throw new SubmissionError(
          "موجودی کیف پول برای برگشت پاداش کافی نیست. اگر کاربر درخواست واریز دارد، ابتدا آن را رد کنید.",
          "INSUFFICIENT_BALANCE",
          409
        );
      }
      if (error.code === "USER_NOT_FOUND") {
        throw new SubmissionError("کاربر پیدا نشد", "USER_NOT_FOUND", 404);
      }
      if (error.code === "CAMPAIGN_NOT_FOUND") {
        throw new SubmissionError("کمپین پیدا نشد", "CAMPAIGN_NOT_FOUND", 404);
      }
    }
    throw error;
  }
}

export async function rejectEarnSubmission(params: {
  submissionId: string;
  reviewerId: string;
  reason: string;
  allowResubmit?: boolean;
}) {
  const { submissionId, reviewerId, reason, allowResubmit = true } = params;
  await connectDB();

  const existing = await EarnSubmission.findById(submissionId).select(
    "status resubmitCount"
  );
  if (!existing) {
    throw new SubmissionError("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }
  if (existing.status !== "pending") {
    throw new SubmissionError(
      "این ارسال قبلاً بررسی شده است.",
      "ALREADY_REVIEWED",
      409
    );
  }

  const usedResubmit = (existing.resubmitCount ?? 0) >= MAX_SUBMISSION_RESUBMITS;
  const nextStatus: EarnSubmissionStatus =
    allowResubmit && !usedResubmit ? "changes_requested" : "rejected";

  const claimed = await EarnSubmission.findOneAndUpdate(
    { _id: submissionId, status: "pending" },
    {
      $set: {
        status: nextStatus,
        reviewerNote: reason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        resubmitCount: existing.resubmitCount ?? 0,
      },
    },
    { new: true }
  );

  if (!claimed) {
    throw new SubmissionError(
      "این ارسال قبلاً بررسی شده است.",
      "ALREADY_REVIEWED",
      409
    );
  }
}

export async function resubmitEarnSubmission(params: {
  userId: string;
  submissionId: string;
  instagramPostUrl: string;
  proofScreenshotUrl: string;
}): Promise<UserSubmissionJson> {
  const { userId, submissionId, instagramPostUrl, proofScreenshotUrl } = params;
  await connectDB();

  const submission = await EarnSubmission.findById(submissionId);
  if (!submission || submission.userId.toString() !== userId) {
    throw new SubmissionError("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }
  if (!canResubmitSubmission(submission)) {
    throw new SubmissionError(
      submission.status === "rejected"
        ? "این ارسال رد شده و امکان اصلاح ندارد."
        : "برای این ارسال امکان ارسال مجدد وجود ندارد.",
      "RESUBMIT_NOT_ALLOWED",
      409
    );
  }

  if (!isOurProofObjectUrl(proofScreenshotUrl, userId)) {
    throw new SubmissionError(
      "اسکرین‌شات باید از طریق همین سامانه آپلود شده باشد.",
      "INVALID_PROOF",
      400
    );
  }

  const campaign = await EarnCampaign.findById(submission.campaignId);
  if (!campaign) {
    throw new SubmissionError("کمپین پیدا نشد", "CAMPAIGN_NOT_FOUND", 404);
  }

  if (instagramPostUrl !== submission.instagramPostUrl) {
    const duplicate = await EarnSubmission.findOne({
      _id: { $ne: submission._id },
      instagramPostUrl,
      status: { $ne: "rejected" },
    }).select("_id");
    if (duplicate) {
      throw new SubmissionError(
        "این لینک پست قبلاً ثبت شده است.",
        "DUPLICATE_URL",
        409
      );
    }
  }

  if (proofScreenshotUrl === submission.proofScreenshotUrl) {
    throw new SubmissionError(
      "اسکرین‌شات تازه از پست اصلاح‌شده لازم است.",
      "INVALID_PROOF",
      400
    );
  }

  try {
    const claimed = await EarnSubmission.findOneAndUpdate(
      {
        _id: submissionId,
        userId: submission.userId,
        status: "changes_requested",
        $expr: {
          $lt: [
            { $ifNull: ["$resubmitCount", 0] },
            MAX_SUBMISSION_RESUBMITS,
          ],
        },
      },
      {
        $set: {
          instagramPostUrl,
          proofScreenshotUrl,
          status: "pending",
          reviewedBy: null,
          reviewedAt: null,
          resubmittedAt: new Date(),
          reviewDueAt: reviewDueAt(
            new Date(),
            submission.reviewSlaHours ?? REVIEW_SLA_HOURS
          ),
        },
        $inc: { resubmitCount: 1 },
      },
      { new: true }
    );

    if (!claimed) {
      throw new SubmissionError(
        "برای این ارسال امکان ارسال مجدد وجود ندارد.",
        "RESUBMIT_NOT_ALLOWED",
        409
      );
    }

    return serializeUserSubmission({
      ...claimed.toObject(),
      campaignId: {
        _id: campaign._id,
        title: campaign.title,
      } as CampaignLean,
    } as SubmissionLean);
  } catch (error) {
    if (error instanceof SubmissionError) throw error;
    if (isDuplicateKey(error)) {
      throw new SubmissionError(
        "این لینک پست قبلاً ثبت شده است.",
        "DUPLICATE_URL",
        409
      );
    }
    throw error;
  }
}

/**
 * Creator sends the Instagram insights for a post once it has had a week:
 * the view count they read plus a screenshot of it. Admin still enters the
 * official number; this gives them the figure and the evidence to check it
 * against. Sending again replaces the earlier insights until the bonus is
 * finalized.
 */
export async function submitDay7Insights(params: {
  userId: string;
  submissionId: string;
  views: number;
  screenshotUrl: string;
}): Promise<UserSubmissionJson> {
  const { userId, submissionId, views, screenshotUrl } = params;
  await connectDB();

  const submission = await EarnSubmission.findById(submissionId);
  if (!submission || submission.userId.toString() !== userId) {
    throw new SubmissionError("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }

  const notEligible = () =>
    new SubmissionError(
      submission.status === "finalized" || submission.finalizedAt
        ? "پاداش این ارسال نهایی شده و دیگر نیازی به اینسایت نیست."
        : "ثبت اینسایت فقط برای پست‌های تأییدشده ممکن است.",
      "INSIGHTS_NOT_ELIGIBLE",
      409
    );

  if (
    !DAY7_ELIGIBLE_STATUSES.includes(submission.status) ||
    submission.finalizedAt ||
    submission.day7Views != null
  ) {
    throw notEligible();
  }

  const opensAt = day7InsightsOpensAt(submission.createdAt);
  if (opensAt && opensAt.getTime() > Date.now()) {
    throw new SubmissionError(
      `اینسایت روز هفتم از ${formatDate(opensAt.toISOString())} باز می‌شود.`,
      "INSIGHTS_NOT_OPEN",
      409
    );
  }

  if (!isOurProofObjectUrl(screenshotUrl, userId)) {
    throw new SubmissionError(
      "اسکرین‌شات باید از طریق همین سامانه آپلود شده باشد.",
      "INVALID_PROOF",
      400
    );
  }
  if (
    screenshotUrl === submission.proofScreenshotUrl ||
    screenshotUrl === submission.day7ProofScreenshotUrl
  ) {
    throw new SubmissionError(
      "برای اینسایت یک اسکرین‌شات تازه لازم است.",
      "INVALID_PROOF",
      400
    );
  }

  const updated = await EarnSubmission.findOneAndUpdate(
    {
      _id: submissionId,
      userId: submission.userId,
      status: { $in: DAY7_ELIGIBLE_STATUSES },
      finalizedAt: null,
      day7Views: null,
    },
    {
      $set: {
        day7ClaimedViews: views,
        day7ProofScreenshotUrl: screenshotUrl,
        day7ProofSubmittedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!updated) throw notEligible();

  const campaign = await EarnCampaign.findById(updated.campaignId).select(
    "title"
  );
  return serializeUserSubmission({
    ...updated.toObject(),
    campaignId: {
      _id: updated.campaignId,
      title: campaign?.title ?? "",
    } as CampaignLean,
  } as SubmissionLean);
}

import "server-only";
import mongoose, { type Types } from "mongoose";
import { creditEarnWallet, EarnWalletError } from "@/lib/earn-wallet";
import connectDB from "@/lib/mongodb";
import { isOurProofObjectUrl } from "@/lib/s3/client";
import {
  canResubmitSubmission,
  isCampaignOpen,
  MAX_SUBMISSION_RESUBMITS,
  type EarnSubmissionStatus,
} from "@/lib/earn";
import {
  activeCampaignMongoFilter,
  serializeCampaign,
} from "@/lib/earn-campaigns";
import type {
  UserCampaignJson,
  UserSubmissionJson,
} from "@/lib/earn-submissions-types";
import EarnCampaign, { type IEarnCampaign } from "@/models/earn-campaign";
import EarnSubmission, { type IEarnSubmission } from "@/models/earn-submission";
import User from "@/models/user";

export type SubmissionErrorCode =
  | "UNVERIFIED"
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_INACTIVE"
  | "INVALID_PROOF"
  | "DUPLICATE_URL"
  | "CAP_REACHED"
  | "SUBMISSION_NOT_FOUND"
  | "ALREADY_REVIEWED"
  | "RESUBMIT_NOT_ALLOWED"
  | "BUDGET_EXCEEDED"
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
  const [submissions, submissionCount, campaigns, counts] = await Promise.all([
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
  ]);

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

  const campaign = await EarnCampaign.findById(submission.campaignId);
  if (!campaign) {
    throw new SubmissionError("کمپین پیدا نشد", "CAMPAIGN_NOT_FOUND", 404);
  }

  const basePayoutToman = campaign.basePayoutToman;
  const now = new Date();

  const claimed = await EarnSubmission.findOneAndUpdate(
    { _id: submissionId, status: "pending" },
    {
      $set: {
        status: "bonus_pending",
        reviewedBy: reviewerId,
        reviewedAt: now,
        reviewerNote: null,
        basePayoutToman,
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

  try {
    if (basePayoutToman > 0) {
      await creditEarnWallet({
        userId: claimed.userId,
        campaignId: claimed.campaignId,
        amountToman: basePayoutToman,
      });
    }
  } catch (error) {
    await EarnSubmission.findByIdAndUpdate(submissionId, {
      $set: {
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        basePayoutToman: 0,
      },
    });
    if (error instanceof EarnWalletError) {
      if (error.code === "BUDGET_EXCEEDED") {
        throw new SubmissionError(
          "بودجه کمپین برای این پاداش کافی نیست.",
          "BUDGET_EXCEEDED",
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

  await EarnSubmission.findByIdAndUpdate(submissionId, {
    $set: { basePaidAt: now },
  });
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

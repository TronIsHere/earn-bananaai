import "server-only";
import type { Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import type { ShowcaseReelJson } from "@/lib/earn-submissions-types";
import EarnSubmission from "@/models/earn-submission";

/*
 * Winning reels gallery: finalized reels that earned money and that an admin
 * chose to feature. Shown on the campaign so the payout is believable and
 * creators see what a good reel looks like. Only the creator's first name is
 * exposed; the post itself is already public on Instagram.
 */

export class ShowcaseError extends Error {
  constructor(
    message: string,
    public readonly code: "SUBMISSION_NOT_FOUND" | "NOT_FEATURABLE",
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "ShowcaseError";
  }
}

/** Most reels shown per campaign. */
export const SHOWCASE_PER_CAMPAIGN = 6;

type ShowcaseLean = {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  instagramPostUrl: string;
  basePayoutToman: number;
  bonusToman: number;
  day7Views: number | null;
  featuredAt: Date;
  userId: { firstName?: string } | null;
};

/** Featured reels for each campaign id, newest feature first. */
export async function listShowcaseByCampaign(
  campaignIds: Array<string | Types.ObjectId>
): Promise<Map<string, ShowcaseReelJson[]>> {
  const byCampaign = new Map<string, ShowcaseReelJson[]>();
  if (campaignIds.length === 0) return byCampaign;

  await connectDB();
  const rows = await EarnSubmission.find({
    campaignId: { $in: campaignIds },
    status: "finalized",
    featuredAt: { $ne: null },
  })
    .sort({ featuredAt: -1 })
    .limit(campaignIds.length * SHOWCASE_PER_CAMPAIGN)
    .populate({ path: "userId", select: "firstName" })
    .lean<ShowcaseLean[]>();

  for (const row of rows) {
    const key = row.campaignId.toString();
    const list = byCampaign.get(key) ?? [];
    if (list.length >= SHOWCASE_PER_CAMPAIGN) continue;
    list.push({
      id: row._id.toString(),
      postUrl: row.instagramPostUrl,
      earnedToman: row.basePayoutToman + row.bonusToman,
      views: row.day7Views ?? 0,
      creatorName: row.userId?.firstName?.trim() || "یک سازنده",
      featuredAt: row.featuredAt.toISOString(),
    });
    byCampaign.set(key, list);
  }
  return byCampaign;
}

/** Admin: add or remove a paid, finalized reel from its campaign gallery. */
export async function setSubmissionFeatured(params: {
  submissionId: string;
  featured: boolean;
}) {
  const { submissionId, featured } = params;
  await connectDB();

  const submission = await EarnSubmission.findById(submissionId).select(
    "status basePayoutToman bonusToman"
  );
  if (!submission) {
    throw new ShowcaseError("ارسال پیدا نشد", "SUBMISSION_NOT_FOUND", 404);
  }
  if (
    featured &&
    (submission.status !== "finalized" ||
      submission.basePayoutToman + submission.bonusToman <= 0)
  ) {
    throw new ShowcaseError(
      "فقط ریل‌های نهایی‌شده‌ای که پاداش گرفته‌اند در گالری نمایش داده می‌شوند.",
      "NOT_FEATURABLE",
      409
    );
  }

  await EarnSubmission.updateOne(
    { _id: submissionId },
    { $set: { featuredAt: featured ? new Date() : null } }
  );
}

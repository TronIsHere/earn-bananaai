import "server-only";
import mongoose, { type Types } from "mongoose";
import {
  creatorLevelForPaidReels,
  type CreatorLevel,
  type CreatorLevelId,
} from "@/lib/earn";
import EarnSubmission from "@/models/earn-submission";

/** A reel that actually put money in the creator's wallet. */
const PAID_REEL_FILTER = {
  status: "finalized" as const,
  $or: [{ bonusToman: { $gt: 0 } }, { basePayoutToman: { $gt: 0 } }],
};

export interface CreatorLevelSnapshot {
  level: CreatorLevel;
  paidReels: number;
}

export interface CreatorLevelJson {
  id: CreatorLevelId;
  paidReels: number;
}

export async function getCreatorLevel(
  userId: string | Types.ObjectId
): Promise<CreatorLevelSnapshot> {
  const paidReels = await EarnSubmission.countDocuments({
    userId,
    ...PAID_REEL_FILTER,
  });
  return { level: creatorLevelForPaidReels(paidReels), paidReels };
}

/** Paid reel counts for many creators at once (admin queues). */
export async function getPaidReelCounts(
  userIds: Array<string | Types.ObjectId>
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const ids = [...new Set(userIds.map((id) => id.toString()))].map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  const rows = await EarnSubmission.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    { $match: { userId: { $in: ids }, ...PAID_REEL_FILTER } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

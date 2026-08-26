import "server-only";
import type { Types } from "mongoose";
import { MIN_PAYOUT_TOMAN } from "@/lib/earn";
import connectDB from "@/lib/mongodb";
import EarnCampaign from "@/models/earn-campaign";
import User from "@/models/user";

export type EarnWalletErrorCode =
  | "INVALID_AMOUNT"
  | "CAMPAIGN_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "BUDGET_EXCEEDED"
  | "BELOW_MINIMUM"
  | "INSUFFICIENT_BALANCE";

export class EarnWalletError extends Error {
  constructor(
    message: string,
    public readonly code: EarnWalletErrorCode
  ) {
    super(message);
    this.name = "EarnWalletError";
  }
}

export interface CreditEarnWalletParams {
  userId: Types.ObjectId | string;
  campaignId: Types.ObjectId | string;
  amountToman: number;
}

export interface CreditEarnWalletResult {
  balance: number;
  lifetimeEarned: number;
  spentBudgetToman: number;
  totalBudgetToman: number;
}

function assertPositiveToman(amountToman: number) {
  if (!Number.isInteger(amountToman) || amountToman <= 0) {
    throw new EarnWalletError(
      "amountToman must be a positive integer",
      "INVALID_AMOUNT"
    );
  }
}

/**
 * Credits the user's Earn wallet and reserves the same amount against the
 * campaign budget. Atomic on the campaign spend so concurrent approvals cannot
 * overshoot `totalBudgetToman` (0 = unlimited).
 */
export async function creditEarnWallet(
  params: CreditEarnWalletParams
): Promise<CreditEarnWalletResult> {
  const { userId, campaignId, amountToman } = params;
  assertPositiveToman(amountToman);
  await connectDB();

  const campaign = await EarnCampaign.findById(campaignId).select(
    "_id totalBudgetToman spentBudgetToman"
  );
  if (!campaign) {
    throw new EarnWalletError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const reserved = await EarnCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      $or: [
        { totalBudgetToman: { $lte: 0 } },
        {
          $expr: {
            $lte: [
              { $add: ["$spentBudgetToman", amountToman] },
              "$totalBudgetToman",
            ],
          },
        },
      ],
    },
    { $inc: { spentBudgetToman: amountToman } },
    { new: true }
  );

  if (!reserved) {
    throw new EarnWalletError(
      "Campaign budget would be exceeded",
      "BUDGET_EXCEEDED"
    );
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        earnWalletBalance: amountToman,
        earnWalletLifetimeEarned: amountToman,
      },
    },
    { new: true }
  );

  if (!user) {
    await EarnCampaign.findByIdAndUpdate(campaignId, {
      $inc: { spentBudgetToman: -amountToman },
    });
    throw new EarnWalletError("User not found", "USER_NOT_FOUND");
  }

  return {
    balance: user.earnWalletBalance,
    lifetimeEarned: user.earnWalletLifetimeEarned,
    spentBudgetToman: reserved.spentBudgetToman,
    totalBudgetToman: reserved.totalBudgetToman,
  };
}

export interface EarnWalletSnapshot {
  available: number;
  lifetimeEarned: number;
  lifetimePaidOut: number;
}

function toSnapshot(user: {
  earnWalletBalance: number;
  earnWalletLifetimeEarned: number;
  earnWalletLifetimePaidOut: number;
}): EarnWalletSnapshot {
  return {
    available: user.earnWalletBalance,
    lifetimeEarned: user.earnWalletLifetimeEarned,
    lifetimePaidOut: user.earnWalletLifetimePaidOut,
  };
}

/** Holds funds for a pending manual payout. Fails if below min or not enough balance. */
export async function reserveEarnPayout(
  userId: Types.ObjectId | string,
  amountToman: number
): Promise<EarnWalletSnapshot> {
  assertPositiveToman(amountToman);
  if (amountToman < MIN_PAYOUT_TOMAN) {
    throw new EarnWalletError(
      "Amount is below the minimum payout",
      "BELOW_MINIMUM"
    );
  }
  await connectDB();

  const user = await User.findOneAndUpdate(
    { _id: userId, earnWalletBalance: { $gte: amountToman } },
    { $inc: { earnWalletBalance: -amountToman } },
    { new: true }
  );

  if (!user) {
    const exists = await User.exists({ _id: userId });
    throw new EarnWalletError(
      exists ? "Insufficient wallet balance" : "User not found",
      exists ? "INSUFFICIENT_BALANCE" : "USER_NOT_FOUND"
    );
  }

  return toSnapshot(user);
}

/** Returns reserved funds after an admin rejects a pending payout. */
export async function refundEarnPayout(
  userId: Types.ObjectId | string,
  amountToman: number
): Promise<EarnWalletSnapshot> {
  assertPositiveToman(amountToman);
  await connectDB();

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { earnWalletBalance: amountToman } },
    { new: true }
  );
  if (!user) {
    throw new EarnWalletError("User not found", "USER_NOT_FOUND");
  }
  return toSnapshot(user);
}

/** Records a completed manual transfer. Balance was already reserved. */
export async function markEarnPayoutPaid(
  userId: Types.ObjectId | string,
  amountToman: number
): Promise<EarnWalletSnapshot> {
  assertPositiveToman(amountToman);
  await connectDB();

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { earnWalletLifetimePaidOut: amountToman } },
    { new: true }
  );
  if (!user) {
    throw new EarnWalletError("User not found", "USER_NOT_FOUND");
  }
  return toSnapshot(user);
}

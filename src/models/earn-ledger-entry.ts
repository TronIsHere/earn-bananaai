import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EARN_LEDGER_TYPES, type EarnLedgerType } from "@/lib/earn-ledger-types";

/**
 * Append-only record of every change to a creator's Earn wallet. The signed
 * deltas let the wallet be rebuilt: summing them per user must equal
 * `earnWalletBalance`, `earnWalletLifetimeEarned` and
 * `earnWalletLifetimePaidOut` on the user.
 */
export interface IEarnLedgerEntry {
  userId: Types.ObjectId;
  type: EarnLedgerType;
  /** Change to the available (withdrawable) balance. */
  balanceDelta: number;
  /** Change to lifetime earned. */
  earnedDelta: number;
  /** Change to lifetime paid out. */
  paidOutDelta: number;
  /** Available balance right after this entry was applied. */
  balanceAfter: number;
  campaignId: Types.ObjectId | null;
  submissionId: Types.ObjectId | null;
  payoutId: Types.ObjectId | null;
  actorId: Types.ObjectId | null;
  note: string | null;
  /** Set for events that must be recorded at most once (e.g. `bonus:<id>`). */
  idempotencyKey?: string | null;
  createdAt: Date;
}

const objectIdRef = (ref: string) => ({
  type: Schema.Types.ObjectId,
  ref,
  default: null,
});

const EarnLedgerEntrySchema = new Schema<IEarnLedgerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: EARN_LEDGER_TYPES, required: true },
    balanceDelta: { type: Number, required: true },
    earnedDelta: { type: Number, required: true, default: 0 },
    paidOutDelta: { type: Number, required: true, default: 0 },
    balanceAfter: { type: Number, required: true },
    campaignId: objectIdRef("EarnCampaign"),
    submissionId: objectIdRef("EarnSubmission"),
    payoutId: objectIdRef("EarnPayout"),
    actorId: objectIdRef("User"),
    note: { type: String, trim: true, maxlength: 500, default: null },
    idempotencyKey: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EarnLedgerEntrySchema.index({ userId: 1, _id: -1 });
EarnLedgerEntrySchema.index({ submissionId: 1 });
EarnLedgerEntrySchema.index({ payoutId: 1 });
EarnLedgerEntrySchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  }
);

const EarnLedgerEntry: Model<IEarnLedgerEntry> =
  mongoose.models.EarnLedgerEntry ||
  mongoose.model<IEarnLedgerEntry>("EarnLedgerEntry", EarnLedgerEntrySchema);

export default EarnLedgerEntry;

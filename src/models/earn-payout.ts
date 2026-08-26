import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EARN_PAYOUT_STATUSES, type EarnPayoutStatus } from "@/lib/earn";

export interface IEarnPayout {
  userId: Types.ObjectId;
  amount: number;
  bankNote: string;
  status: EarnPayoutStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  adminNote: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EarnPayoutSchema = new Schema<IEarnPayout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    bankNote: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: EARN_PAYOUT_STATUSES,
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

EarnPayoutSchema.index({ userId: 1, createdAt: -1 });
EarnPayoutSchema.index({ status: 1, createdAt: -1 });
EarnPayoutSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

const EarnPayout: Model<IEarnPayout> =
  mongoose.models.EarnPayout ||
  mongoose.model<IEarnPayout>("EarnPayout", EarnPayoutSchema);

export default EarnPayout;

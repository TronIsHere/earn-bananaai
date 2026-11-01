import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { EARN_PAYOUT_STATUSES, type EarnPayoutStatus } from "@/lib/earn";

export interface IEarnPayout {
  userId: Types.ObjectId;
  amount: number;
  /** Legacy free-text account details. New requests use the SHEBA fields. */
  bankNote: string;
  /** Snapshot of the creator's SHEBA at request time. */
  bankSheba: string | null;
  bankAccountHolder: string | null;
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
      trim: true,
      maxlength: 500,
      default: "",
    },
    bankSheba: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    bankAccountHolder: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
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

const existingModel = mongoose.models.EarnPayout as
  | Model<IEarnPayout>
  | undefined;
if (existingModel && !existingModel.schema.path("bankSheba")) {
  mongoose.deleteModel("EarnPayout");
}

const EarnPayout: Model<IEarnPayout> =
  mongoose.models.EarnPayout ||
  mongoose.model<IEarnPayout>("EarnPayout", EarnPayoutSchema);

export default EarnPayout;

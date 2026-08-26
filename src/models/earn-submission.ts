import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  EARN_SUBMISSION_STATUSES,
  type EarnSubmissionStatus,
} from "@/lib/earn";

export interface IEarnSubmission {
  userId: Types.ObjectId;
  campaignId: Types.ObjectId;
  instagramPostUrl: string;
  proofScreenshotUrl: string;
  status: EarnSubmissionStatus;
  reviewerNote: string | null;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  resubmitCount: number;
  resubmittedAt: Date | null;
  basePayoutToman: number;
  basePaidAt: Date | null;
  day7Views: number | null;
  bonusToman: number;
  bonusPaidAt: Date | null;
  finalizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EarnSubmissionSchema = new Schema<IEarnSubmission>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "EarnCampaign",
      required: true,
    },
    instagramPostUrl: {
      type: String,
      required: true,
      trim: true,
    },
    proofScreenshotUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: EARN_SUBMISSION_STATUSES,
      default: "pending",
    },
    reviewerNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
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
    resubmitCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    resubmittedAt: {
      type: Date,
      default: null,
    },
    basePayoutToman: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    basePaidAt: {
      type: Date,
      default: null,
    },
    day7Views: {
      type: Number,
      default: null,
      min: 0,
    },
    bonusToman: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    bonusPaidAt: {
      type: Date,
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

EarnSubmissionSchema.index({ status: 1, createdAt: -1 });
EarnSubmissionSchema.index({ userId: 1, campaignId: 1 });
EarnSubmissionSchema.index({ campaignId: 1, status: 1 });
EarnSubmissionSchema.index(
  { instagramPostUrl: 1 },
  {
    unique: true,
    // Final rejects free the URL. changes_requested still owns it so the
    // creator can fix the same post without losing the slot.
    partialFilterExpression: { status: { $ne: "rejected" } },
  }
);

const existingModel = mongoose.models.EarnSubmission as
  | Model<IEarnSubmission>
  | undefined;
if (existingModel && !existingModel.schema.path("resubmitCount")) {
  mongoose.deleteModel("EarnSubmission");
}

const EarnSubmission: Model<IEarnSubmission> =
  mongoose.models.EarnSubmission ||
  mongoose.model<IEarnSubmission>("EarnSubmission", EarnSubmissionSchema);

export default EarnSubmission;

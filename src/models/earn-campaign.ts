import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  EARN_CAMPAIGN_STATUSES,
  EARN_PLATFORMS,
  type EarnCampaignStatus,
} from "@/lib/earn";
import type { PromptPackItem, ViewBonusTier } from "@/lib/types";

export interface IEarnCampaign {
  title: string;
  brief: string;
  requirementsChecklist: string[];
  requiredHashtags: string[];
  requiredMentions: string[];
  minVideoLengthSeconds: number;
  mediaKitUrls: string[];
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  maxSubmissionsPerUser: number;
  totalBudgetToman: number;
  spentBudgetToman: number;
  deadline: Date | null;
  /** Until this time only early-access creator levels can join. */
  earlyAccessUntil: Date | null;
  status: EarnCampaignStatus;
  platform: (typeof EARN_PLATFORMS)[number];
  trending: boolean;
  toolUrl: string | null;
  promptPack: PromptPackItem[];
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ViewBonusTierSchema = new Schema<ViewBonusTier>(
  {
    minViews: { type: Number, required: true, min: 0 },
    bonusToman: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PromptPackItemSchema = new Schema<PromptPackItem>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    prompt: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const EarnCampaignSchema = new Schema<IEarnCampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    brief: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    requirementsChecklist: {
      type: [String],
      default: [],
    },
    requiredHashtags: {
      type: [String],
      default: [],
    },
    requiredMentions: {
      type: [String],
      default: [],
    },
    minVideoLengthSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    mediaKitUrls: {
      type: [String],
      default: [],
    },
    viewBonusTiers: {
      type: [ViewBonusTierSchema],
      default: [],
    },
    maxPayoutPerVideoToman: {
      type: Number,
      required: true,
      min: 0,
    },
    maxSubmissionsPerUser: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
    },
    totalBudgetToman: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    spentBudgetToman: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      default: null,
    },
    earlyAccessUntil: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: EARN_CAMPAIGN_STATUSES,
      default: "draft",
      index: true,
    },
    platform: {
      type: String,
      enum: [...EARN_PLATFORMS, "youtube"],
      default: "instagram",
      index: true,
    },
    trending: {
      type: Boolean,
      default: false,
    },
    toolUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    promptPack: {
      type: [PromptPackItemSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

EarnCampaignSchema.pre("validate", function () {
  if (Array.isArray(this.viewBonusTiers) && this.viewBonusTiers.length > 1) {
    this.viewBonusTiers.sort((a, b) => a.minViews - b.minViews);
  }
});

EarnCampaignSchema.index({ status: 1, deadline: 1 });
EarnCampaignSchema.index({ createdAt: -1 });

const existingModel = mongoose.models.EarnCampaign as
  | Model<IEarnCampaign>
  | undefined;
if (
  existingModel &&
  (!existingModel.schema.path("earlyAccessUntil") ||
    existingModel.schema.path("basePayoutToman"))
) {
  mongoose.deleteModel("EarnCampaign");
}

const EarnCampaign: Model<IEarnCampaign> =
  mongoose.models.EarnCampaign ||
  mongoose.model<IEarnCampaign>("EarnCampaign", EarnCampaignSchema);

export default EarnCampaign;

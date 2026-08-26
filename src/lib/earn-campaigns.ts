import "server-only";
import mongoose, { type Types } from "mongoose";
import { isCampaignOpen, type EarnCampaignStatus, type EarnPlatform } from "@/lib/earn";
import connectDB from "@/lib/mongodb";
import type { ViewBonusTier } from "@/lib/types";
import EarnCampaign, { type IEarnCampaign } from "@/models/earn-campaign";

export type CampaignErrorCode =
  | "NOT_FOUND"
  | "INVALID"
  | "PAYOUT_CAP";

export class CampaignError extends Error {
  constructor(
    message: string,
    public readonly code: CampaignErrorCode,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "CampaignError";
  }
}

export interface CampaignJson {
  id: string;
  title: string;
  brief: string;
  platform: EarnPlatform;
  requirementsChecklist: string[];
  requiredHashtags: string[];
  requiredMentions: string[];
  minVideoLengthSeconds: number;
  mediaKitUrls: string[];
  basePayoutToman: number;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  maxSubmissionsPerUser: number;
  totalBudgetToman: number;
  spentBudgetToman: number;
  deadline: string | null;
  status: EarnCampaignStatus;
  createdAt: string;
  trending: boolean;
}

export type CampaignLean = IEarnCampaign & { _id: Types.ObjectId };

export function activeCampaignMongoFilter(now = new Date()) {
  return {
    status: "active" as const,
    $or: [{ deadline: null }, { deadline: { $gt: now } }],
  };
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function serializeCampaign(doc: CampaignLean): CampaignJson {
  return {
    id: doc._id.toString(),
    title: doc.title,
    brief: doc.brief,
    platform: "instagram",
    requirementsChecklist: doc.requirementsChecklist ?? [],
    requiredHashtags: doc.requiredHashtags ?? [],
    requiredMentions: doc.requiredMentions ?? [],
    minVideoLengthSeconds: doc.minVideoLengthSeconds ?? 0,
    mediaKitUrls: doc.mediaKitUrls ?? [],
    basePayoutToman: doc.basePayoutToman,
    viewBonusTiers: doc.viewBonusTiers ?? [],
    maxPayoutPerVideoToman: doc.maxPayoutPerVideoToman,
    maxSubmissionsPerUser: doc.maxSubmissionsPerUser,
    totalBudgetToman: doc.totalBudgetToman,
    spentBudgetToman: doc.spentBudgetToman,
    deadline: toIso(doc.deadline),
    status: doc.status,
    createdAt: toIso(doc.createdAt) ?? new Date().toISOString(),
    trending: Boolean(doc.trending),
  };
}

export async function listPublicCampaigns(): Promise<CampaignJson[]> {
  await connectDB();
  const campaigns = await EarnCampaign.find(activeCampaignMongoFilter())
    .sort({ trending: -1, createdAt: -1 })
    .lean<CampaignLean[]>();
  return campaigns.filter((campaign) => isCampaignOpen(campaign)).map(serializeCampaign);
}

export async function listAdminCampaigns(): Promise<CampaignJson[]> {
  await connectDB();
  const campaigns = await EarnCampaign.find()
    .sort({ createdAt: -1 })
    .lean<CampaignLean[]>();
  return campaigns.map(serializeCampaign);
}

export interface CreateCampaignInput {
  title: string;
  brief: string;
  platform: EarnPlatform;
  requirementsChecklist: string[];
  requiredHashtags: string[];
  requiredMentions: string[];
  minVideoLengthSeconds: number;
  mediaKitUrls: string[];
  basePayoutToman: number;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  maxSubmissionsPerUser: number;
  totalBudgetToman: number;
  deadline: Date | null;
  status: EarnCampaignStatus;
  trending: boolean;
  createdBy: string;
}

export async function createCampaign(
  input: CreateCampaignInput
): Promise<CampaignJson> {
  await connectDB();
  try {
    const created = await EarnCampaign.create({
      title: input.title,
      brief: input.brief,
      platform: input.platform,
      requirementsChecklist: input.requirementsChecklist,
      requiredHashtags: input.requiredHashtags,
      requiredMentions: input.requiredMentions,
      minVideoLengthSeconds: input.minVideoLengthSeconds,
      mediaKitUrls: input.mediaKitUrls,
      basePayoutToman: input.basePayoutToman,
      viewBonusTiers: input.viewBonusTiers,
      maxPayoutPerVideoToman: input.maxPayoutPerVideoToman,
      maxSubmissionsPerUser: input.maxSubmissionsPerUser,
      totalBudgetToman: input.totalBudgetToman,
      spentBudgetToman: 0,
      deadline: input.deadline,
      status: input.status,
      trending: input.trending,
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
    });
    return serializeCampaign(created.toObject() as CampaignLean);
  } catch (error) {
    throw mapCampaignWriteError(error);
  }
}

export type UpdateCampaignInput = Partial<
  Omit<CreateCampaignInput, "createdBy">
>;

export async function updateCampaign(
  id: string,
  patch: UpdateCampaignInput
): Promise<CampaignJson> {
  await connectDB();
  const campaign = await EarnCampaign.findById(id);
  if (!campaign) {
    throw new CampaignError("کمپین پیدا نشد", "NOT_FOUND", 404);
  }

  if (patch.title !== undefined) campaign.title = patch.title;
  if (patch.brief !== undefined) campaign.brief = patch.brief;
  if (patch.platform !== undefined) campaign.platform = patch.platform;
  if (patch.requirementsChecklist !== undefined) {
    campaign.requirementsChecklist = patch.requirementsChecklist;
  }
  if (patch.requiredHashtags !== undefined) {
    campaign.requiredHashtags = patch.requiredHashtags;
  }
  if (patch.requiredMentions !== undefined) {
    campaign.requiredMentions = patch.requiredMentions;
  }
  if (patch.minVideoLengthSeconds !== undefined) {
    campaign.minVideoLengthSeconds = patch.minVideoLengthSeconds;
  }
  if (patch.mediaKitUrls !== undefined) campaign.mediaKitUrls = patch.mediaKitUrls;
  if (patch.basePayoutToman !== undefined) {
    campaign.basePayoutToman = patch.basePayoutToman;
  }
  if (patch.viewBonusTiers !== undefined) {
    campaign.viewBonusTiers = patch.viewBonusTiers;
  }
  if (patch.maxPayoutPerVideoToman !== undefined) {
    campaign.maxPayoutPerVideoToman = patch.maxPayoutPerVideoToman;
  }
  if (patch.maxSubmissionsPerUser !== undefined) {
    campaign.maxSubmissionsPerUser = patch.maxSubmissionsPerUser;
  }
  if (patch.totalBudgetToman !== undefined) {
    campaign.totalBudgetToman = patch.totalBudgetToman;
  }
  if (patch.deadline !== undefined) campaign.deadline = patch.deadline;
  if (patch.status !== undefined) campaign.status = patch.status;
  if (patch.trending !== undefined) campaign.trending = patch.trending;

  try {
    await campaign.save();
  } catch (error) {
    throw mapCampaignWriteError(error);
  }

  return serializeCampaign(campaign.toObject() as CampaignLean);
}

function mapCampaignWriteError(error: unknown): CampaignError {
  if (error instanceof CampaignError) return error;
  if (error instanceof mongoose.Error.ValidationError) {
    const payoutCap = Object.values(error.errors).some((item) =>
      item.message.includes("maxPayoutPerVideoToman")
    );
    return new CampaignError(
      payoutCap
        ? "سقف هر ویدیو باید حداقل برابر پاداش پایه باشد"
        : "اطلاعات کمپین نامعتبر است",
      payoutCap ? "PAYOUT_CAP" : "INVALID",
      400
    );
  }
  const message =
    error instanceof Error ? error.message : "خطا در ذخیره کمپین";
  return new CampaignError(message, "INVALID", 400);
}

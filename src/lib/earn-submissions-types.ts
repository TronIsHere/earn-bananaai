import type { EarnSubmissionStatus } from "@/lib/earn";
import type { ViewBonusTier } from "@/lib/types";

export interface UserCampaignJson {
  id: string;
  title: string;
  brief: string;
  platform: "instagram";
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
  status: string;
  createdAt: string;
  trending: boolean;
  submittedCount: number;
  remainingSubmissions: number;
}

export interface UserSubmissionJson {
  id: string;
  campaignId: string;
  campaignTitle: string;
  platform: "instagram";
  postUrl: string;
  proofScreenshotUrl: string;
  status: EarnSubmissionStatus;
  basePayoutToman: number;
  bonusToman: number;
  views: number;
  reviewerNote: string | null;
  resubmitCount: number;
  canResubmit: boolean;
  createdAt: string;
  resubmittedAt: string | null;
}

export interface AdminSubmissionUserJson {
  id: string;
  firstName: string;
  lastName: string;
  instagramHandle: string | null;
  mobileNumber: string;
}

export interface AdminSubmissionCampaignJson {
  id: string;
  title: string;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  basePayoutToman: number;
  spentBudgetToman: number;
  totalBudgetToman: number;
}

export interface AdminSubmissionJson {
  id: string;
  status: EarnSubmissionStatus;
  instagramPostUrl: string;
  proofScreenshotUrl: string;
  reviewerNote: string | null;
  resubmitCount: number;
  basePayoutToman: number;
  bonusToman: number;
  day7Views: number | null;
  basePaidAt: string | null;
  bonusPaidAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  resubmittedAt: string | null;
  user: AdminSubmissionUserJson | null;
  campaign: AdminSubmissionCampaignJson | null;
}

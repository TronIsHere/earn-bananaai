import type { EarnSubmissionStatus } from "@/lib/earn";
import type { PromptPackItem, ViewBonusTier } from "@/lib/types";

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
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  maxSubmissionsPerUser: number;
  totalBudgetToman: number;
  spentBudgetToman: number;
  deadline: string | null;
  status: string;
  createdAt: string;
  trending: boolean;
  toolUrl: string | null;
  promptPack: PromptPackItem[];
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
  /** When the creator may send day-7 insights (7 days after submitting). */
  day7OpensAt: string | null;
  /** The 7 days have passed, whether or not the creator can still send now. */
  day7InsightsOpen: boolean;
  canSubmitInsights: boolean;
  day7ClaimedViews: number | null;
  day7ProofScreenshotUrl: string | null;
  day7ProofSubmittedAt: string | null;
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
  day7ClaimedViews: number | null;
  day7ProofScreenshotUrl: string | null;
  day7ProofSubmittedAt: string | null;
  basePaidAt: string | null;
  bonusPaidAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  resubmittedAt: string | null;
  user: AdminSubmissionUserJson | null;
  campaign: AdminSubmissionCampaignJson | null;
}

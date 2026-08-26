export type Platform = "instagram";

export type CampaignStatus = "draft" | "active" | "paused" | "ended";

export type SubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "bonus_pending"
  | "finalized";

export interface ViewBonusTier {
  minViews: number;
  bonusToman: number;
}

export interface Campaign {
  id: string;
  title: string;
  brief: string;
  platform: Platform;
  requirementsChecklist: string[];
  requiredHashtags: string[];
  requiredMentions: string[];
  basePayoutToman: number;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  maxSubmissionsPerUser: number;
  totalBudgetToman: number;
  spentBudgetToman: number;
  deadline: string | null;
  status: CampaignStatus;
  createdAt: string;
  trending?: boolean;
}

export interface Submission {
  id: string;
  campaignId: string;
  campaignTitle: string;
  platform: Platform;
  postUrl: string;
  proofScreenshotUrl?: string;
  status: SubmissionStatus;
  basePayoutToman: number;
  bonusToman: number;
  views: number;
  reviewerNote?: string | null;
  createdAt: string;
}

export interface BillingEntry {
  id: string;
  type: "earn" | "payout" | "bonus";
  title: string;
  amount: number;
  status: "paid" | "pending" | "rejected";
  createdAt: string;
}

export interface Wallet {
  available: number;
  lifetimeEarned: number;
  lifetimePaidOut: number;
}

export interface Profile {
  id?: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  instagramHandle: string | null;
  youtubeHandle: string | null;
  instagramStatus: "none" | "pending" | "verified" | "rejected";
  youtubeStatus: "none" | "pending" | "verified" | "rejected";
  verificationCode: string;
  verificationNote: string | null;
  verificationRequestedAt: string | null;
}

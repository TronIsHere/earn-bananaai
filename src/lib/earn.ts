import type { ViewBonusTier } from "./types";

/** Client-safe Earn constants and pure helpers. Do not import Mongoose here. */

/** One good video should clear this so the first cash-out creates believers. */
export const MIN_PAYOUT_TOMAN = 400_000;

/** Floor high enough that posting is worth the effort even before bonuses. */
export const DEFAULT_BASE_PAYOUT_TOMAN = 400_000;
export const DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN = 2_000_000;
export const DEFAULT_CAMPAIGN_BUDGET_TOMAN = 15_000_000;

export const DREAM_VIEW_BONUS_TOMAN = 1_000_000;

/** Admin review promise shown in the UI. Uncertainty about when is worse than the wait. */
export const REVIEW_SLA_HOURS = 48;
export const REVIEW_SLA_DUE_SOON_HOURS = 6;
export const REVIEW_SLA_LABEL = "بررسی حداکثر ۴۸ ساعت";

export const DEFAULT_VIEW_BONUS_TIERS = [
  { minViews: 1_000, bonusToman: 100_000 },
  { minViews: 5_000, bonusToman: 300_000 },
  { minViews: 20_000, bonusToman: 500_000 },
  { minViews: 50_000, bonusToman: 750_000 },
  { minViews: 100_000, bonusToman: DREAM_VIEW_BONUS_TOMAN },
] as const satisfies readonly ViewBonusTier[];

/**
 * Scale a default view-bonus amount with the campaign's per-video cap.
 * At the default 2M cap this is a no-op (100k / 300k / 500k / 750k / 1M).
 */
export function scaleViewBonusToman(
  defaultBonusToman: number,
  maxPayoutPerVideoToman: number,
  referenceMaxPayoutToman = DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN
): number {
  if (referenceMaxPayoutToman <= 0) return 0;
  const max = Math.max(0, maxPayoutPerVideoToman);
  return Math.round((defaultBonusToman * max) / referenceMaxPayoutToman);
}

/** Default view thresholds with bonuses scaled to this campaign's per-video cap. */
export function viewBonusTiersForMaxPayout(
  maxPayoutPerVideoToman: number,
  minViews?: Array<number | null | undefined>
): ViewBonusTier[] {
  return DEFAULT_VIEW_BONUS_TIERS.map((tier, index) => {
    const views = minViews?.[index];
    return {
      minViews: typeof views === "number" && Number.isFinite(views) ? views : tier.minViews,
      bonusToman: scaleViewBonusToman(tier.bonusToman, maxPayoutPerVideoToman),
    };
  });
}

export const EARN_PLATFORMS = ["instagram"] as const;

export const EARN_CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "ended",
] as const;

export const EARN_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "bonus_pending",
  "finalized",
] as const;

/** One chance to fix a technicality (missing hashtag, etc.) on the same post. */
export const MAX_SUBMISSION_RESUBMITS = 1;

export const FIXABLE_REJECT_REASONS = [
  "هشتگ الزامی در کپشن نیست",
  "منشن الزامی رعایت نشده",
  "اسکرین‌شات با پست مطابقت ندارد",
  "مدت ویدیو کمتر از حد مجاز است",
  "محتوای کمپین در پست دیده نمی‌شود",
] as const;

export function canResubmitSubmission(submission: {
  status: string;
  resubmitCount?: number | null;
}): boolean {
  return (
    submission.status === "changes_requested" &&
    (submission.resubmitCount ?? 0) < MAX_SUBMISSION_RESUBMITS
  );
}

export const EARN_PAYOUT_STATUSES = ["pending", "paid", "rejected"] as const;

export const EARN_VERIFICATION_STATUSES = [
  "none",
  "pending",
  "verified",
  "rejected",
] as const;

export type EarnCampaignStatus = (typeof EARN_CAMPAIGN_STATUSES)[number];
export type EarnSubmissionStatus = (typeof EARN_SUBMISSION_STATUSES)[number];
export type EarnPayoutStatus = (typeof EARN_PAYOUT_STATUSES)[number];
export type EarnVerificationStatus = (typeof EARN_VERIFICATION_STATUSES)[number];
export type EarnPlatform = (typeof EARN_PLATFORMS)[number];

export function isEarnCampaignStatus(
  value: unknown
): value is EarnCampaignStatus {
  return (
    typeof value === "string" &&
    (EARN_CAMPAIGN_STATUSES as readonly string[]).includes(value)
  );
}

/** Active and not past deadline. Shared by public list and submission gates. */
export function isCampaignOpen(
  campaign: { status: string; deadline: Date | string | null },
  now = new Date()
): boolean {
  if (campaign.status !== "active") return false;
  if (!campaign.deadline) return true;
  const deadline =
    campaign.deadline instanceof Date
      ? campaign.deadline
      : new Date(campaign.deadline);
  if (Number.isNaN(deadline.getTime())) return true;
  return deadline.getTime() > now.getTime();
}

/** Highest view-bonus tier whose minViews the count meets, or null. */
export function matchViewBonusTier(
  views: number,
  tiers: ViewBonusTier[]
): ViewBonusTier | null {
  const sorted = [...tiers].sort((a, b) => a.minViews - b.minViews);
  let matched: ViewBonusTier | null = null;
  for (const tier of sorted) {
    if (views >= tier.minViews) matched = tier;
  }
  return matched;
}

/** Sum of every stage bonus the view count has reached (uncapped). */
export function sumReachedViewBonusToman(
  views: number,
  tiers: ViewBonusTier[]
): number {
  return [...tiers]
    .filter((tier) => views >= tier.minViews)
    .reduce((sum, tier) => sum + tier.bonusToman, 0);
}

/** Remaining bonus room so base + bonus never exceeds the per-video cap. */
export function viewBonusRemainingCap(
  maxPayoutPerVideoToman: number,
  basePayoutToman: number
): number {
  return Math.max(0, maxPayoutPerVideoToman - basePayoutToman);
}

/**
 * Sum of reached stage bonuses, capped so base + bonus never exceeds
 * max payout per video. Hitting the top stage typically pays the full cap.
 */
export function computeViewBonusToman(
  views: number,
  tiers: ViewBonusTier[],
  maxPayoutPerVideoToman: number,
  basePayoutToman: number
): number {
  const bonus = sumReachedViewBonusToman(views, tiers);
  return Math.min(
    bonus,
    viewBonusRemainingCap(maxPayoutPerVideoToman, basePayoutToman)
  );
}

/** Base payout plus the capped view bonus for a hypothetical view count. */
export function computeCampaignPayoutToman(
  views: number,
  tiers: ViewBonusTier[],
  maxPayoutPerVideoToman: number,
  basePayoutToman: number
): number {
  return (
    basePayoutToman +
    computeViewBonusToman(
      views,
      tiers,
      maxPayoutPerVideoToman,
      basePayoutToman
    )
  );
}

/** Next unpaid view-bonus tier above `views`, or null at the top. */
export function nextViewBonusTier(
  views: number,
  tiers: ViewBonusTier[]
): ViewBonusTier | null {
  const sorted = [...tiers].sort((a, b) => a.minViews - b.minViews);
  return sorted.find((tier) => tier.minViews > views) ?? null;
}

const NICE_VIEW_CAPS = [
  5_000, 10_000, 20_000, 25_000, 40_000, 50_000, 100_000, 200_000, 250_000,
  500_000, 1_000_000,
] as const;

/** Slider ceiling: about 2× the top bonus tier, snapped to a round number. */
export function earningsSliderMaxViews(tiers: ViewBonusTier[]): number {
  const top = tiers.reduce((max, tier) => Math.max(max, tier.minViews), 0);
  if (top <= 0) return 10_000;
  const target = top * 2;
  return NICE_VIEW_CAPS.find((n) => n >= target) ?? target;
}

/** Start on the highest bonus tier so the upside is visible before they drag. */
export function defaultEarningsSliderViews(tiers: ViewBonusTier[]): number {
  const top = tiers.reduce((max, tier) => Math.max(max, tier.minViews), 0);
  return top > 0 ? top : 1_000;
}

export function earningsSliderStep(maxViews: number): number {
  if (maxViews <= 10_000) return 100;
  if (maxViews <= 50_000) return 500;
  return 1_000;
}

/** Whether crediting `amountToman` would exceed a campaign budget (0 = unlimited). */
export function exceedsCampaignBudget(
  spentBudgetToman: number,
  totalBudgetToman: number,
  amountToman: number
): boolean {
  if (totalBudgetToman <= 0) return false;
  return spentBudgetToman + amountToman > totalBudgetToman;
}

export function remainingBudgetToman(
  spentBudgetToman: number,
  totalBudgetToman: number
): number {
  if (totalBudgetToman <= 0) return 0;
  return Math.max(0, totalBudgetToman - spentBudgetToman);
}

export function spentBudgetPercent(
  spentBudgetToman: number,
  totalBudgetToman: number
): number {
  if (totalBudgetToman <= 0) return 0;
  return Math.min(100, Math.max(0, (spentBudgetToman / totalBudgetToman) * 100));
}

export type CampaignBudgetUrgency = "ok" | "low" | "critical" | "empty";

/** Scarcity signal for public remaining-budget UI. */
export function campaignBudgetUrgency(
  remaining: number,
  totalBudgetToman: number,
  basePayoutToman = 0
): CampaignBudgetUrgency {
  if (totalBudgetToman <= 0) return "ok";
  if (remaining <= 0) return "empty";
  const ratio = remaining / totalBudgetToman;
  if (remaining < basePayoutToman || ratio <= 0.1) return "critical";
  if (ratio <= 0.25) return "low";
  return "ok";
}

/** Top view-threshold in this campaign (رویا). Falls back to the 1M bonus mark. */
export function isDreamViewBonusTier(
  tier: ViewBonusTier,
  tiers?: readonly ViewBonusTier[]
): boolean {
  if (tiers && tiers.length > 0) {
    const top = Math.max(...tiers.map((row) => row.minViews));
    return tier.minViews === top;
  }
  return tier.bonusToman >= DREAM_VIEW_BONUS_TOMAN;
}

export type ReviewSlaTone = "ok" | "due_soon" | "overdue";

export interface ReviewSlaSnapshot {
  dueAt: string;
  remainingMs: number;
  tone: ReviewSlaTone;
}

function toValidDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function reviewDueAt(startedAt: Date | string): Date | null {
  const start = toValidDate(startedAt);
  if (!start) return null;
  return new Date(start.getTime() + REVIEW_SLA_HOURS * 60 * 60 * 1000);
}

export function reviewSlaSnapshot(
  startedAt: Date | string,
  now = new Date()
): ReviewSlaSnapshot | null {
  const due = reviewDueAt(startedAt);
  if (!due) return null;
  const remainingMs = due.getTime() - now.getTime();
  const dueSoonMs = REVIEW_SLA_DUE_SOON_HOURS * 60 * 60 * 1000;
  const tone: ReviewSlaTone =
    remainingMs <= 0 ? "overdue" : remainingMs <= dueSoonMs ? "due_soon" : "ok";
  return { dueAt: due.toISOString(), remainingMs, tone };
}

export function countReviewSlaOverdue(
  startedAts: Array<string | Date | null | undefined>,
  now = new Date()
): number {
  return startedAts.filter((startedAt) => {
    if (!startedAt) return false;
    return reviewSlaSnapshot(startedAt, now)?.tone === "overdue";
  }).length;
}

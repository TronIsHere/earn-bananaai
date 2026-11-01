import type { ViewBonusTier } from "./types";

/** Client-safe Earn constants and pure helpers. Do not import Mongoose here. */

/** One good video should clear this so the first cash-out creates believers. */
export const MIN_PAYOUT_TOMAN = 400_000;

/** No flat payout on approval: a reel earns nothing until it reaches this many views. */
export const MIN_PAID_VIEWS = 1_000;
export const DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN = 7_000_000;
export const DEFAULT_CAMPAIGN_BUDGET_TOMAN = 40_000_000;

export const DREAM_VIEW_BONUS_TOMAN = 1_000_000;

/** Admin review promise shown in the UI. Uncertainty about when is worse than the wait. */
export const REVIEW_SLA_HOURS = 48;
export const REVIEW_SLA_DUE_SOON_HOURS = 6;
export const REVIEW_SLA_LABEL = "بررسی حداکثر ۴۸ ساعت";

export const DEFAULT_VIEW_BONUS_TIERS = [
  { minViews: MIN_PAID_VIEWS, bonusToman: 100_000 },
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
  referenceMaxPayoutToman = DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
): number {
  if (referenceMaxPayoutToman <= 0) return 0;
  const max = Math.max(0, maxPayoutPerVideoToman);
  return Math.round((defaultBonusToman * max) / referenceMaxPayoutToman);
}

/** Default view thresholds with bonuses scaled to this campaign's per-video cap. */
export function viewBonusTiersForMaxPayout(
  maxPayoutPerVideoToman: number,
  minViews?: Array<number | null | undefined>,
): ViewBonusTier[] {
  return DEFAULT_VIEW_BONUS_TIERS.map((tier, index) => {
    const views = minViews?.[index];
    return {
      minViews:
        typeof views === "number" && Number.isFinite(views)
          ? views
          : tier.minViews,
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

/** Statuses where the post is approved and the day-7 view payout is still open. */
export const DAY7_ELIGIBLE_STATUSES: readonly EarnSubmissionStatus[] = [
  "bonus_pending",
  "approved",
];

/** Days after submitting a post before its insights are worth screenshotting. */
export const DAY7_INSIGHTS_DELAY_DAYS = 7;

export function day7InsightsOpensAt(submittedAt: Date | string): Date | null {
  const start = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(
    start.getTime() + DAY7_INSIGHTS_DELAY_DAYS * 24 * 60 * 60 * 1000,
  );
}

/** Whether the creator can send day-7 insights for this submission right now. */
export function canSubmitDay7Insights(
  submission: {
    status: string;
    createdAt: Date | string;
    finalizedAt?: Date | string | null;
    day7Views?: number | null;
  },
  now = new Date(),
): boolean {
  if (!(DAY7_ELIGIBLE_STATUSES as readonly string[]).includes(submission.status)) {
    return false;
  }
  if (submission.finalizedAt || submission.day7Views != null) return false;
  const opensAt = day7InsightsOpensAt(submission.createdAt);
  return opensAt != null && opensAt.getTime() <= now.getTime();
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
export type EarnVerificationStatus =
  (typeof EARN_VERIFICATION_STATUSES)[number];
export type EarnPlatform = (typeof EARN_PLATFORMS)[number];

export function isEarnCampaignStatus(
  value: unknown,
): value is EarnCampaignStatus {
  return (
    typeof value === "string" &&
    (EARN_CAMPAIGN_STATUSES as readonly string[]).includes(value)
  );
}

/** Active and not past deadline. Shared by public list and submission gates. */
export function isCampaignOpen(
  campaign: { status: string; deadline: Date | string | null },
  now = new Date(),
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
  tiers: ViewBonusTier[],
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
  tiers: ViewBonusTier[],
): number {
  return [...tiers]
    .filter((tier) => views >= tier.minViews)
    .reduce((sum, tier) => sum + tier.bonusToman, 0);
}

/**
 * Remaining bonus room under the per-video cap. `alreadyPaidToman` is only
 * non-zero for legacy submissions that were credited a base payout on approval.
 */
export function viewBonusRemainingCap(
  maxPayoutPerVideoToman: number,
  alreadyPaidToman = 0,
): number {
  return Math.max(0, maxPayoutPerVideoToman - alreadyPaidToman);
}

/**
 * Sum of reached stage bonuses, capped at max payout per video. Below
 * MIN_PAID_VIEWS nothing is paid. Hitting the top stage typically pays the full cap.
 */
export function computeViewBonusToman(
  views: number,
  tiers: ViewBonusTier[],
  maxPayoutPerVideoToman: number,
  alreadyPaidToman = 0,
): number {
  if (views < MIN_PAID_VIEWS) return 0;
  const bonus = sumReachedViewBonusToman(views, tiers);
  return Math.min(
    bonus,
    viewBonusRemainingCap(maxPayoutPerVideoToman, alreadyPaidToman),
  );
}

/** What a reel earns at a hypothetical view count (capped per video). */
export function computeCampaignPayoutToman(
  views: number,
  tiers: ViewBonusTier[],
  maxPayoutPerVideoToman: number,
): number {
  return computeViewBonusToman(views, tiers, maxPayoutPerVideoToman);
}

/** Next unpaid view-bonus tier above `views`, or null at the top. */
export function nextViewBonusTier(
  views: number,
  tiers: ViewBonusTier[],
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
  amountToman: number,
): boolean {
  if (totalBudgetToman <= 0) return false;
  return spentBudgetToman + amountToman > totalBudgetToman;
}

export function remainingBudgetToman(
  spentBudgetToman: number,
  totalBudgetToman: number,
): number {
  if (totalBudgetToman <= 0) return 0;
  return Math.max(0, totalBudgetToman - spentBudgetToman);
}

export function spentBudgetPercent(
  spentBudgetToman: number,
  totalBudgetToman: number,
): number {
  if (totalBudgetToman <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, (spentBudgetToman / totalBudgetToman) * 100),
  );
}

export type CampaignBudgetUrgency = "ok" | "low" | "critical" | "empty";

/** Scarcity signal for public remaining-budget UI. */
export function campaignBudgetUrgency(
  remaining: number,
  totalBudgetToman: number,
): CampaignBudgetUrgency {
  if (totalBudgetToman <= 0) return "ok";
  if (remaining <= 0) return "empty";
  const ratio = remaining / totalBudgetToman;
  if (ratio <= 0.1) return "critical";
  if (ratio <= 0.25) return "low";
  return "ok";
}

/** Top view-threshold in this campaign (رویا). Falls back to the 1M bonus mark. */
export function isDreamViewBonusTier(
  tier: ViewBonusTier,
  tiers?: readonly ViewBonusTier[],
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

export function reviewSlaLabel(slaHours = REVIEW_SLA_HOURS): string {
  return `بررسی حداکثر ${slaHours.toLocaleString("fa-IR")} ساعت`;
}

export function reviewDueAt(
  startedAt: Date | string,
  slaHours = REVIEW_SLA_HOURS,
): Date | null {
  const start = toValidDate(startedAt);
  if (!start) return null;
  return new Date(start.getTime() + slaHours * 60 * 60 * 1000);
}

export function reviewSlaSnapshot(
  startedAt: Date | string,
  now = new Date(),
  slaHours = REVIEW_SLA_HOURS,
): ReviewSlaSnapshot | null {
  const due = reviewDueAt(startedAt, slaHours);
  if (!due) return null;
  const remainingMs = due.getTime() - now.getTime();
  const dueSoonMs = REVIEW_SLA_DUE_SOON_HOURS * 60 * 60 * 1000;
  const tone: ReviewSlaTone =
    remainingMs <= 0 ? "overdue" : remainingMs <= dueSoonMs ? "due_soon" : "ok";
  return { dueAt: due.toISOString(), remainingMs, tone };
}

/** A review clock start, optionally with a per-item SLA (creator level). */
export type ReviewSlaStart =
  | string
  | Date
  | null
  | undefined
  | { startedAt: string | Date | null | undefined; slaHours?: number };

export function countReviewSlaOverdue(
  starts: ReviewSlaStart[],
  now = new Date(),
): number {
  return starts.filter((start) => {
    const { startedAt, slaHours } =
      start && typeof start === "object" && !(start instanceof Date)
        ? start
        : { startedAt: start, slaHours: undefined };
    if (!startedAt) return false;
    return reviewSlaSnapshot(startedAt, now, slaHours)?.tone === "overdue";
  }).length;
}

/*
 * Creator levels: private perks for creators who have been paid before.
 * A "paid reel" is a finalized submission that credited money. No leaderboard;
 * each creator only sees their own level.
 */
export const CREATOR_LEVEL_IDS = ["starter", "pro", "star"] as const;
export type CreatorLevelId = (typeof CREATOR_LEVEL_IDS)[number];

export interface CreatorLevel {
  id: CreatorLevelId;
  label: string;
  minPaidReels: number;
  reviewSlaHours: number;
  /** Added to every view-bonus stage and to the per-video cap. */
  payoutBoostPercent: number;
  /** Can join campaigns during their early-access window. */
  earlyAccess: boolean;
}

export const CREATOR_LEVELS: readonly CreatorLevel[] = [
  {
    id: "starter",
    label: "تازه‌کار",
    minPaidReels: 0,
    reviewSlaHours: REVIEW_SLA_HOURS,
    payoutBoostPercent: 0,
    earlyAccess: false,
  },
  {
    id: "pro",
    label: "حرفه‌ای",
    minPaidReels: 3,
    reviewSlaHours: 24,
    payoutBoostPercent: 25,
    earlyAccess: false,
  },
  {
    id: "star",
    label: "ستاره",
    minPaidReels: 8,
    reviewSlaHours: 24,
    payoutBoostPercent: 50,
    earlyAccess: true,
  },
];

export const EARLY_ACCESS_LEVEL: CreatorLevel = CREATOR_LEVELS.find(
  (level) => level.earlyAccess,
)!;

export function isCreatorLevelId(value: unknown): value is CreatorLevelId {
  return (
    typeof value === "string" &&
    (CREATOR_LEVEL_IDS as readonly string[]).includes(value)
  );
}

export function creatorLevelById(id: CreatorLevelId | null | undefined): CreatorLevel {
  return CREATOR_LEVELS.find((level) => level.id === id) ?? CREATOR_LEVELS[0];
}

export function creatorLevelForPaidReels(paidReels: number): CreatorLevel {
  let current = CREATOR_LEVELS[0];
  for (const level of CREATOR_LEVELS) {
    if (paidReels >= level.minPaidReels) current = level;
  }
  return current;
}

export function nextCreatorLevel(level: CreatorLevel): CreatorLevel | null {
  const index = CREATOR_LEVELS.findIndex((row) => row.id === level.id);
  return CREATOR_LEVELS[index + 1] ?? null;
}

function boostToman(amountToman: number, level: CreatorLevel): number {
  return Math.round((Math.max(0, amountToman) * (100 + level.payoutBoostPercent)) / 100);
}

/** Campaign per-video cap with the creator's level boost applied. */
export function creatorMaxPayoutPerVideoToman(
  maxPayoutPerVideoToman: number,
  level: CreatorLevel,
): number {
  return boostToman(maxPayoutPerVideoToman, level);
}

/**
 * Campaign view-bonus stages with the creator's level boost applied. Pair with
 * `creatorMaxPayoutPerVideoToman` so the boost is paid, not swallowed by the cap.
 */
export function creatorViewBonusTiers(
  tiers: readonly ViewBonusTier[],
  level: CreatorLevel,
): ViewBonusTier[] {
  return tiers.map((tier) => ({
    minViews: tier.minViews,
    bonusToman: boostToman(tier.bonusToman, level),
  }));
}

/** Campaign is still inside its early-access window (only some levels may join). */
export function isCampaignInEarlyAccess(
  campaign: { earlyAccessUntil?: Date | string | null },
  now = new Date(),
): boolean {
  if (!campaign.earlyAccessUntil) return false;
  const until = toValidDate(campaign.earlyAccessUntil);
  return until != null && until.getTime() > now.getTime();
}

export function isCampaignLockedForLevel(
  campaign: { earlyAccessUntil?: Date | string | null },
  level: CreatorLevel,
  now = new Date(),
): boolean {
  return isCampaignInEarlyAccess(campaign, now) && !level.earlyAccess;
}

/* Campaign urgency chips shown on the card header. */

/** Show "X٪ بودجه مصرف شد" once at least this share of the budget is gone. */
export const BUDGET_URGENCY_SPENT_PERCENT = 50;
/** Show "X روز مانده" once the deadline is this close. */
export const DEADLINE_URGENCY_DAYS = 7;

export type CampaignUrgencyTone = "notice" | "warn" | "hot";

export interface CampaignUrgencyChip {
  label: string;
  tone: CampaignUrgencyTone;
}

export function campaignBudgetUrgencyChip(
  spentBudgetToman: number,
  totalBudgetToman: number,
): CampaignUrgencyChip | null {
  if (totalBudgetToman <= 0) return null;
  const spent = Math.floor(spentBudgetPercent(spentBudgetToman, totalBudgetToman));
  if (spent < BUDGET_URGENCY_SPENT_PERCENT) return null;
  const urgency = campaignBudgetUrgency(
    remainingBudgetToman(spentBudgetToman, totalBudgetToman),
    totalBudgetToman,
  );
  if (urgency === "empty") return { label: "بودجه تمام شد", tone: "hot" };
  return {
    label: `${spent.toLocaleString("fa-IR")}٪ بودجه مصرف شد`,
    tone: urgency === "critical" ? "hot" : urgency === "low" ? "warn" : "notice",
  };
}

export function campaignDeadlineUrgencyChip(
  deadline: Date | string | null | undefined,
  now = new Date(),
): CampaignUrgencyChip | null {
  if (!deadline) return null;
  const end = toValidDate(deadline);
  if (!end) return null;
  const remainingMs = end.getTime() - now.getTime();
  if (remainingMs <= 0) return null;
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  if (remainingMs > DEADLINE_URGENCY_DAYS * dayMs) return null;
  if (remainingMs < dayMs) {
    const hours = Math.max(1, Math.ceil(remainingMs / hourMs));
    return { label: `${hours.toLocaleString("fa-IR")} ساعت مانده`, tone: "hot" };
  }
  const days = Math.ceil(remainingMs / dayMs);
  return {
    label: `${days.toLocaleString("fa-IR")} روز مانده`,
    tone: days <= 3 ? "warn" : "notice",
  };
}

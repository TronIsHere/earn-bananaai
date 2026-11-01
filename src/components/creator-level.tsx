import type { LucideIcon } from "lucide-react";
import { Crown, Flame, Lock, Rocket, Star, Zap } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { brandGlassCard } from "@/lib/brand";
import {
  CREATOR_LEVELS,
  creatorLevelById,
  nextCreatorLevel,
  type CreatorLevel,
  type CreatorLevelId,
} from "@/lib/earn";
import { cn, formatToman } from "@/lib/utils";

const levelIcon: Record<CreatorLevelId, LucideIcon> = {
  starter: Rocket,
  pro: Zap,
  star: Crown,
};

const levelChipClass: Record<CreatorLevelId, string> = {
  starter: "border-white/10 bg-white/6 text-white/60",
  pro: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  star: "border-brand/35 bg-brand/12 text-brand",
};

export function CreatorLevelChip({
  level,
  className,
}: {
  level: CreatorLevelId;
  className?: string;
}) {
  const row = creatorLevelById(level);
  const Icon = levelIcon[row.id];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        levelChipClass[row.id],
        className
      )}
    >
      <Icon className="size-3" />
      {row.label}
    </span>
  );
}

type Perk = {
  key: string;
  kind: "review" | "cap" | "early";
  label: string;
  /** First level that unlocks it. */
  level: CreatorLevel;
};

/** What each level adds over the one before it, read from CREATOR_LEVELS. */
const LEVEL_PERKS: Perk[] = CREATOR_LEVELS.flatMap((level, index) => {
  const prev = CREATOR_LEVELS[index - 1];
  if (!prev) return [];
  const perks: Perk[] = [];
  if (level.reviewSlaHours < prev.reviewSlaHours) {
    perks.push({
      key: `review-${level.id}`,
      kind: "review",
      label: `بررسی ${formatToman(level.reviewSlaHours)} ساعته`,
      level,
    });
  }
  if (level.payoutBoostPercent > prev.payoutBoostPercent) {
    perks.push({
      key: `cap-${level.id}`,
      kind: "cap",
      label: `پاداش هر ریل +${formatToman(level.payoutBoostPercent)}٪`,
      level,
    });
  }
  if (level.earlyAccess && !prev.earlyAccess) {
    perks.push({
      key: `early-${level.id}`,
      kind: "early",
      label: "دسترسی زودهنگام به کمپین‌های داغ",
      level,
    });
  }
  return perks;
});

const perkIcon: Record<Perk["kind"], LucideIcon> = {
  review: Zap,
  cap: Star,
  early: Flame,
};

function isUnlocked(perk: Perk, level: CreatorLevel) {
  return level.minPaidReels >= perk.level.minPaidReels;
}

/** Hide a smaller cap boost once a bigger one is unlocked. */
function visiblePerks(level: CreatorLevel): Perk[] {
  return LEVEL_PERKS.filter(
    (perk) =>
      !LEVEL_PERKS.some(
        (other) =>
          other.kind === perk.kind &&
          other.level.minPaidReels > perk.level.minPaidReels &&
          isUnlocked(other, level)
      )
  );
}

/** Private progress card: current level, what it gives, and what is next. */
export function CreatorLevelCard({
  level: levelId,
  paidReels,
  className,
}: {
  level: CreatorLevelId;
  paidReels: number;
  className?: string;
}) {
  const level = creatorLevelById(levelId);
  const next = nextCreatorLevel(level);
  const Icon = levelIcon[level.id];
  const toNext = next ? Math.max(0, next.minPaidReels - paidReels) : 0;
  const progress = next
    ? ((paidReels - level.minPaidReels) / (next.minPaidReels - level.minPaidReels)) * 100
    : 100;

  return (
    <section className={cn(brandGlassCard, "p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              level.id === "star" ? "bg-brand text-brand-ink" : "bg-brand/12 text-brand"
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-xs text-white/45">سطح سازنده</div>
            <div className="mt-0.5 text-lg font-extrabold text-white">{level.label}</div>
          </div>
        </div>
        <div className="text-left text-xs text-white/45">
          <strong className="earn-money text-base text-white">{formatToman(paidReels)}</strong>{" "}
          ریل پولی
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <ProgressBar value={progress} />
        <p className="text-xs text-white/50">
          {next ? (
            <>
              {formatToman(toNext)} ریل پولی دیگر تا سطح{" "}
              <strong className="text-white">{next.label}</strong>
            </>
          ) : (
            "بالاترین سطح. همه امتیازها برای تو باز است."
          )}
        </p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {visiblePerks(level).map((perk) => {
          const unlocked = isUnlocked(perk, level);
          const PerkIcon = unlocked ? perkIcon[perk.kind] : Lock;
          return (
            <li
              key={perk.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                unlocked
                  ? "border-brand/30 bg-brand/10 text-white"
                  : "border-white/8 bg-black/20 text-white/45"
              )}
            >
              <PerkIcon className={cn("size-3", unlocked ? "text-brand" : "text-white/35")} />
              {perk.label}
              {!unlocked && <span className="text-white/30">· {perk.level.label}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

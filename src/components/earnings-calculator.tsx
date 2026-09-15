"use client";

import { useMemo, useState } from "react";
import { Crown, Eye, TrendingUp } from "lucide-react";
import {
  computeCampaignPayoutToman,
  computeViewBonusToman,
  defaultEarningsSliderViews,
  earningsSliderMaxViews,
  earningsSliderStep,
  nextViewBonusTier,
  sumReachedViewBonusToman,
} from "@/lib/earn";
import type { ViewBonusTier } from "@/lib/types";
import { cn, formatToman, formatTomanCompact, formatViewsCompact } from "@/lib/utils";
import { Money } from "@/components/money";

/**
 * "If your reel gets N views you earn X" slider. `variant="hero"` is the big
 * landing-page version; `variant="card"` sits inside a campaign card.
 */
export function EarningsCalculator({
  basePayoutToman,
  viewBonusTiers,
  maxPayoutPerVideoToman,
  variant = "card",
  initialViews,
  onViewsChange,
  className,
}: {
  basePayoutToman: number;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  variant?: "card" | "hero";
  initialViews?: number;
  onViewsChange?: (views: number) => void;
  className?: string;
}) {
  const maxViews = useMemo(
    () => earningsSliderMaxViews(viewBonusTiers),
    [viewBonusTiers]
  );
  const step = earningsSliderStep(maxViews);
  const [views, setViewsState] = useState(() =>
    Math.min(initialViews ?? defaultEarningsSliderViews(viewBonusTiers), maxViews)
  );
  const setViews = (next: number) => {
    setViewsState(next);
    onViewsChange?.(next);
  };

  const bonus = computeViewBonusToman(
    views,
    viewBonusTiers,
    maxPayoutPerVideoToman,
    basePayoutToman
  );
  const total = computeCampaignPayoutToman(
    views,
    viewBonusTiers,
    maxPayoutPerVideoToman,
    basePayoutToman
  );
  const nextTier = nextViewBonusTier(views, viewBonusTiers);
  const rawBonus = sumReachedViewBonusToman(views, viewBonusTiers);
  const atCap =
    maxPayoutPerVideoToman > 0 && total >= maxPayoutPerVideoToman && rawBonus > 0;
  const fillPct = maxViews > 0 ? (views / maxViews) * 100 : 0;
  const hero = variant === "hero";

  const nextTotal = nextTier
    ? computeCampaignPayoutToman(
        nextTier.minViews,
        viewBonusTiers,
        maxPayoutPerVideoToman,
        basePayoutToman
      )
    : null;

  const sortedTiers = useMemo(
    () => [...viewBonusTiers].sort((a, b) => a.minViews - b.minViews),
    [viewBonusTiers]
  );
  const topTier = sortedTiers[sortedTiers.length - 1];

  return (
    <div
      className={cn(
        hero
          ? "space-y-5"
          : "mb-3 rounded-2xl border border-brand/20 bg-brand/[0.06] px-3.5 py-3.5",
        className
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className={cn(hero && "space-y-1")}>
        <p
          className={cn(
            "leading-relaxed text-white/60",
            hero ? "text-sm sm:text-base" : "text-xs"
          )}
        >
          اگر ریل تو{" "}
          <strong className="text-white">{formatToman(views)}</strong> بازدید
          بگیرد
        </p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <Money
            amount={total}
            size={hero ? "hero" : "lg"}
            durationMs={450}
            valueClassName="text-brand"
            unitClassName="text-brand/80"
          />
          <span
            className={cn(
              "pb-1 font-semibold text-white/70",
              hero ? "text-base" : "text-xs"
            )}
          >
            می‌گیری
          </span>
        </div>
      </div>

      <div className={cn("relative", hero ? "mt-2" : "mt-3")} dir="ltr">
        {sortedTiers.map((tier) => {
          if (tier.minViews <= 0 || tier.minViews > maxViews) return null;
          const left = (tier.minViews / maxViews) * 100;
          const reached = views >= tier.minViews;
          return (
            <span
              key={tier.minViews}
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-[7px] size-2 -translate-x-1/2 rounded-full border border-black/40",
                reached ? "bg-brand-ink" : "bg-white/40"
              )}
              style={{ left: `${left}%` }}
            />
          );
        })}
        <input
          type="range"
          min={0}
          max={maxViews}
          step={step}
          value={views}
          onChange={(event) => setViews(Number(event.target.value))}
          onClick={(event) => event.stopPropagation()}
          aria-label="بازدید ریل"
          aria-valuemin={0}
          aria-valuemax={maxViews}
          aria-valuenow={views}
          aria-valuetext={`${formatToman(views)} بازدید، ${formatToman(total)} تومان`}
          className="earn-range"
          style={{ ["--fill" as string]: `${fillPct}%` }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/35">
          <span>۰</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" />
            {formatViewsCompact(maxViews)} بازدید
          </span>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1",
          hero ? "text-sm text-white/60" : "text-[11px] text-white/45"
        )}
      >
        <span>
          پایه{" "}
          <strong className="text-white/85">{formatTomanCompact(basePayoutToman)}</strong>
        </span>
        <span className="text-white/25">+</span>
        <span>
          پاداش بازدید{" "}
          <strong className={cn(bonus > 0 ? "text-brand" : "text-white/50")}>
            {formatTomanCompact(bonus)}
          </strong>
        </span>
        {atCap ? (
          <span className="inline-flex items-center gap-1 font-semibold text-brand">
            <Crown className="size-3.5" />
            سقف پرداخت این ریل
          </span>
        ) : nextTier && nextTotal != null ? (
          <span className="inline-flex items-center gap-1 text-white/55">
            <TrendingUp className="size-3.5 text-brand" />
            با {formatViewsCompact(nextTier.minViews)} بازدید می‌شود{" "}
            <strong className="text-white/85">{formatTomanCompact(nextTotal)}</strong>
          </span>
        ) : null}
      </div>

      {sortedTiers.length > 0 && (
        <div className={cn("flex flex-wrap gap-1.5", hero ? "pt-1" : "mt-3")}>
          <TierButton
            active={views < (sortedTiers[0]?.minViews ?? Infinity)}
            onClick={() => setViews(0)}
            label="فقط تأیید"
            amount={basePayoutToman}
          />
          {sortedTiers.map((tier) => {
            const reached = views >= tier.minViews;
            const isTop = topTier != null && tier.minViews === topTier.minViews;
            return (
              <TierButton
                key={`${tier.minViews}-${tier.bonusToman}`}
                active={reached}
                pressed={views === tier.minViews}
                dream={isTop}
                onClick={() => setViews(Math.min(tier.minViews, maxViews))}
                label={`${formatViewsCompact(tier.minViews)} بازدید`}
                amount={computeCampaignPayoutToman(
                  tier.minViews,
                  sortedTiers,
                  maxPayoutPerVideoToman,
                  basePayoutToman
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TierButton({
  active,
  pressed,
  dream,
  onClick,
  label,
  amount,
}: {
  active: boolean;
  pressed?: boolean;
  dream?: boolean;
  onClick: () => void;
  label: string;
  amount: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all",
        dream
          ? "border-brand/50 bg-brand/15 text-white"
          : "border-white/10 bg-black/25 text-white/70",
        active ? "opacity-100" : "opacity-50 hover:opacity-90",
        pressed && "ring-2 ring-brand/40"
      )}
    >
      {dream ? <Crown className="size-3 text-brand" /> : null}
      <span>{label}</span>
      <span className={cn("font-bold", dream ? "text-brand" : "text-white/85")}>
        {formatTomanCompact(amount)}
      </span>
    </button>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Eye, Sparkles } from "lucide-react";
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
import { cn, formatToman } from "@/lib/utils";
import { TierChip } from "@/components/tier-chip";

export function EarningsCalculator({
  basePayoutToman,
  viewBonusTiers,
  maxPayoutPerVideoToman,
}: {
  basePayoutToman: number;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
}) {
  const maxViews = useMemo(
    () => earningsSliderMaxViews(viewBonusTiers),
    [viewBonusTiers]
  );
  const step = earningsSliderStep(maxViews);
  const [views, setViews] = useState(() =>
    Math.min(defaultEarningsSliderViews(viewBonusTiers), maxViews)
  );

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
  const contentWord = "ریل‌ت";

  const nextTotal = nextTier
    ? computeCampaignPayoutToman(
        nextTier.minViews,
        viewBonusTiers,
        maxPayoutPerVideoToman,
        basePayoutToman
      )
    : null;

  return (
    <div
      className="mb-3 rounded-xl border border-brand/20 bg-brand/6 px-3 py-3"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="text-xs leading-relaxed text-white/55">
        اگر {contentWord}{" "}
        <strong className="text-white">{formatToman(views)}</strong> بازدید
        بگیرد
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-brand">
        {formatToman(total)}
        <span className="mr-1 text-sm font-semibold text-brand/80">
          تومان می‌گیری
        </span>
      </p>

      <div className="relative mt-3" dir="ltr">
        {viewBonusTiers.map((tier) => {
          if (tier.minViews <= 0 || tier.minViews > maxViews) return null;
          const left = (tier.minViews / maxViews) * 100;
          const reached = views >= tier.minViews;
          return (
            <span
              key={tier.minViews}
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1.5 size-1.5 -translate-x-1/2 rounded-full",
                reached ? "bg-brand-ink" : "bg-white/35"
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
          aria-label={`بازدید ${contentWord}`}
          aria-valuemin={0}
          aria-valuemax={maxViews}
          aria-valuenow={views}
          aria-valuetext={`${formatToman(views)} بازدید، ${formatToman(total)} تومان`}
          className="earn-range"
          style={{ ["--fill" as string]: `${fillPct}%` }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/30">
          <span>۰</span>
          <span className="inline-flex items-center gap-0.5">
            <Eye className="size-2.5" />
            {formatToman(maxViews)}
          </span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-white/40">
        پایه {formatToman(basePayoutToman)}
        {bonus > 0 ? (
          <>
            {" "}
            + پاداش سطوح {formatToman(bonus)}
          </>
        ) : (
          <> — هنوز به پله پاداش بازدید نرسیدی</>
        )}
      </p>

      {atCap ? (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-brand">
          <Sparkles className="size-3" />
          به سقف پرداخت این ویدیو رسیدی
        </p>
      ) : nextTier && nextTotal != null ? (
        <p className="mt-1 text-[11px] text-white/45">
          با {formatToman(nextTier.minViews)} بازدید می‌شود{" "}
          <span className="font-semibold text-white/80">
            {formatToman(nextTotal)} تومان
          </span>
        </p>
      ) : null}

      {viewBonusTiers.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {viewBonusTiers.map((tier, i) => {
            const active = views >= tier.minViews;
            return (
              <button
                key={`${tier.minViews}-${tier.bonusToman}`}
                type="button"
                onClick={() => setViews(Math.min(tier.minViews, maxViews))}
                className={cn(
                  "rounded-full transition-opacity",
                  active ? "opacity-100" : "opacity-60 hover:opacity-90"
                )}
                aria-pressed={views === tier.minViews}
              >
                <TierChip
                  tier={tier}
                  index={i}
                  tiers={viewBonusTiers}
                  payoutToman={computeCampaignPayoutToman(
                    tier.minViews,
                    viewBonusTiers,
                    maxPayoutPerVideoToman,
                    basePayoutToman
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

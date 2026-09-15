import { Crown, Eye } from "lucide-react";
import {
  computeCampaignPayoutToman,
  isDreamViewBonusTier,
} from "@/lib/earn";
import type { ViewBonusTier } from "@/lib/types";
import { cn, formatToman, formatTomanCompact, formatViewsCompact } from "@/lib/utils";

/**
 * Visual "the more views, the more money" ladder. Each rung shows the total a
 * creator takes home at that view count (base + reached bonuses, capped).
 */
export function PayoutLadder({
  basePayoutToman,
  viewBonusTiers,
  maxPayoutPerVideoToman,
  activeViews,
  compact = false,
  className,
}: {
  basePayoutToman: number;
  viewBonusTiers: ViewBonusTier[];
  maxPayoutPerVideoToman: number;
  /** Highlights rungs at or below this view count. */
  activeViews?: number;
  compact?: boolean;
  className?: string;
}) {
  const sorted = [...viewBonusTiers].sort((a, b) => a.minViews - b.minViews);
  const rungs = [
    { minViews: 0, label: "تأیید پست", total: basePayoutToman, dream: false },
    ...sorted.map((tier) => ({
      minViews: tier.minViews,
      label: `${formatViewsCompact(tier.minViews)} بازدید`,
      total: computeCampaignPayoutToman(
        tier.minViews,
        sorted,
        maxPayoutPerVideoToman,
        basePayoutToman
      ),
      dream: isDreamViewBonusTier(tier, sorted),
    })),
  ];
  const max = Math.max(maxPayoutPerVideoToman, ...rungs.map((r) => r.total), 1);

  return (
    <ol className={cn("space-y-2", compact && "space-y-1.5", className)}>
      {rungs.map((rung, index) => {
        const reached = activeViews == null ? true : activeViews >= rung.minViews;
        const width = Math.max(18, (rung.total / max) * 100);
        return (
          <li
            key={`${rung.minViews}-${index}`}
            className={cn(
              "relative rounded-xl border transition-colors",
              rung.dream
                ? "border-brand/40 bg-brand/[0.08]"
                : "border-white/8 bg-black/25",
              !reached && "opacity-45"
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
              aria-hidden
            >
              <div
                className={cn(
                  "absolute inset-y-0 right-0",
                  rung.dream ? "bg-brand/15" : "bg-brand/[0.07]"
                )}
                style={{ width: `${width}%` }}
              />
            </div>
            <div
              className={cn(
                "relative flex items-center justify-between gap-3 px-3",
                compact ? "py-2" : "py-2.5"
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    rung.dream
                      ? "bg-brand text-brand-ink"
                      : "bg-white/8 text-white/70"
                  )}
                >
                  {rung.dream ? <Crown className="size-3" /> : formatToman(index + 1)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 truncate",
                    compact ? "text-[11px]" : "text-xs",
                    rung.dream ? "font-semibold text-white" : "text-white/70"
                  )}
                >
                  {index > 0 ? <Eye className="size-3 text-white/35" /> : null}
                  {rung.label}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                <span
                  className={cn(
                    "earn-money",
                    compact ? "text-sm" : "text-base",
                    rung.dream ? "text-brand" : "text-white"
                  )}
                >
                  {formatTomanCompact(rung.total)}
                </span>
                <span className="text-[10px] font-medium text-white/40">
                  تومان
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

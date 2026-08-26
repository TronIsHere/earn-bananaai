import {
  campaignBudgetUrgency,
  remainingBudgetToman,
  spentBudgetPercent,
  type CampaignBudgetUrgency,
} from "@/lib/earn";
import { cn, formatToman } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";

const urgencyCopy: Record<CampaignBudgetUrgency, string> = {
  ok: "بودجه باقی‌مانده",
  low: "بودجه رو به اتمام",
  critical: "عجله کن — بودجه کم است",
  empty: "بودجه این کمپین تمام شده",
};

const urgencyLabelClass: Record<CampaignBudgetUrgency, string> = {
  ok: "text-white/40",
  low: "text-amber-300",
  critical: "text-rose-300",
  empty: "text-rose-300",
};

const urgencyBarClass: Record<CampaignBudgetUrgency, string> = {
  ok: "bg-brand",
  low: "bg-amber-400",
  critical: "bg-rose-400",
  empty: "bg-rose-500",
};

export function CampaignBudgetMeter({
  spentBudgetToman,
  totalBudgetToman,
  basePayoutToman = 0,
  compact = false,
}: {
  spentBudgetToman: number;
  totalBudgetToman: number;
  basePayoutToman?: number;
  compact?: boolean;
}) {
  if (totalBudgetToman <= 0) return null;

  const remaining = remainingBudgetToman(spentBudgetToman, totalBudgetToman);
  const spentPct = spentBudgetPercent(spentBudgetToman, totalBudgetToman);
  const urgency = campaignBudgetUrgency(
    remaining,
    totalBudgetToman,
    basePayoutToman
  );

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        <span className={cn("font-medium", urgencyLabelClass[urgency])}>
          {urgencyCopy[urgency]}
        </span>
        <span className="text-white/45">
          <strong
            className={cn(
              "font-bold",
              compact ? "" : "text-sm",
              urgency === "ok" ? "text-brand" : urgencyLabelClass[urgency]
            )}
          >
            {formatToman(remaining)}
          </strong>
          <span className="text-white/30">
            {" "}
            از {formatToman(totalBudgetToman)} تومان
          </span>
        </span>
      </div>
      <ProgressBar value={spentPct} className={urgencyBarClass[urgency]} />
    </div>
  );
}

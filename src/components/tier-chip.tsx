import { Eye, Sparkles } from "lucide-react";
import { isDreamViewBonusTier } from "@/lib/earn";
import type { ViewBonusTier } from "@/lib/types";
import { cn, formatToman } from "@/lib/utils";

export function TierChip({
  tier,
  index,
  tiers,
  payoutToman,
}: {
  tier: ViewBonusTier;
  index: number;
  tiers?: readonly ViewBonusTier[];
  /** Full amount at this stage (base + bonus). When omitted, shows the bonus only. */
  payoutToman?: number;
}) {
  const dream = isDreamViewBonusTier(tier, tiers);
  const amount = payoutToman ?? tier.bonusToman;
  const prefix = payoutToman == null ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        dream
          ? "border-brand/40 bg-brand/12 text-white"
          : "border-white/10 bg-black/20 text-white/65"
      )}
    >
      <span className="flex size-4 items-center justify-center rounded-full bg-brand/15 text-[9px] font-bold text-brand">
        {dream ? <Sparkles className="size-2.5" /> : index + 1}
      </span>
      <Eye className="size-3 text-white/35" />
      {formatToman(tier.minViews)}+
      <span className="text-brand">
        {prefix}
        {formatToman(amount)} تومان
      </span>
    </span>
  );
}

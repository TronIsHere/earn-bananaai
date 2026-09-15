import type { LucideIcon } from "lucide-react";
import { brandGlassCard, brandIconBg } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        brandGlassCard,
        "relative overflow-hidden p-4 sm:p-5",
        highlight && "border-brand/30 bg-brand/[0.06]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-white/50">{label}</div>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            highlight ? "bg-brand text-brand-ink" : brandIconBg
          )}
        >
          <Icon className={cn("size-4", !highlight && "text-brand")} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="earn-money text-2xl text-white sm:text-3xl">{value}</span>
        {suffix && (
          <span className="text-xs font-medium text-white/40">{suffix}</span>
        )}
      </div>
    </div>
  );
}

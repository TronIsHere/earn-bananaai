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
        highlight && "border-brand/25 bg-brand/[0.06]"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          brandIconBg
        )}
      >
        <Icon className="size-4 text-brand" />
      </div>
      <div className="mt-3 text-xs text-white/45">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-bold text-white sm:text-2xl">
          {value}
        </span>
        {suffix && (
          <span className="text-xs font-normal text-white/40">{suffix}</span>
        )}
      </div>
    </div>
  );
}

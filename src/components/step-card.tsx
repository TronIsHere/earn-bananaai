import type { LucideIcon } from "lucide-react";
import { brandGlassCard, brandGlassCardHover, brandIconBg } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        brandGlassCard,
        brandGlassCardHover,
        "relative flex flex-col gap-3 p-5"
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl",
            brandIconBg
          )}
        >
          <Icon className="size-5 text-brand" />
        </div>
        <span className="text-3xl font-black text-white/10">
          {String(step).padStart(2, "0")}
        </span>
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/55">{description}</p>
    </div>
  );
}

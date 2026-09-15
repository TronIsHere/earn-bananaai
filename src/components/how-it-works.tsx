import type { LucideIcon } from "lucide-react";
import { Banknote, Clapperboard, Link2, UserRoundCheck } from "lucide-react";
import { REVIEW_SLA_HOURS } from "@/lib/earn";
import { brandGlassCard } from "@/lib/brand";
import { cn, formatToman } from "@/lib/utils";

export type HowItWorksStep = {
  icon: LucideIcon;
  title: string;
  text: string;
  outcome: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    icon: UserRoundCheck,
    title: "پیجت را وصل کن",
    text: "با شماره موبایل وارد شو، کد سفیر بنانا را در بیوی اینستاگرام بگذار و درخواست تأیید بده.",
    outcome: "تأیید پیج",
  },
  {
    icon: Clapperboard,
    title: "با هوش مصنوعی بساز",
    text: "یک کمپین انتخاب کن، با ابزارهای بنانا ریل بساز و طبق چک‌لیست کمپین در اینستاگرام منتشر کن.",
    outcome: "پست منتشر شد",
  },
  {
    icon: Link2,
    title: "لینک پست را ثبت کن",
    text: `لینک ریل و یک اسکرین‌شات بفرست. تیم ما حداکثر ${formatToman(REVIEW_SLA_HOURS)} ساعته بررسی می‌کند.`,
    outcome: "پاداش پایه واریز شد",
  },
  {
    icon: Banknote,
    title: "پول بگیر",
    text: "روز هفتم بازدید ثبت می‌شود و پاداش بازدید اضافه می‌شود. بعد از رسیدن به حداقل برداشت، به شبا یا کارتت واریز می‌کنیم.",
    outcome: "واریز به حساب",
  },
];

/** Four numbered steps with a connecting rail. Works as a section on its own. */
export function HowItWorks({
  steps = HOW_IT_WORKS_STEPS,
  compact = false,
  className,
}: {
  steps?: HowItWorksStep[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4",
        className
      )}
    >
      {steps.map((step, index) => {
        const Icon = step.icon;
        const last = index === steps.length - 1;
        return (
          <li
            key={step.title}
            className={cn(
              brandGlassCard,
              "relative flex flex-col gap-3 p-5",
              last && "border-brand/30 bg-brand/[0.05]"
            )}
          >
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-2xl",
                  last ? "bg-brand text-brand-ink" : "bg-brand/12 text-brand"
                )}
              >
                <Icon className="size-5" />
              </div>
              <span className="earn-money text-3xl text-white/10">
                {formatToman(index + 1).padStart(2, "۰")}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{step.title}</h3>
              {!compact && (
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                  {step.text}
                </p>
              )}
            </div>
            <div
              className={cn(
                "mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                last ? "bg-brand text-brand-ink" : "bg-white/6 text-white/70"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  last ? "bg-brand-ink" : "bg-brand"
                )}
              />
              {step.outcome}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

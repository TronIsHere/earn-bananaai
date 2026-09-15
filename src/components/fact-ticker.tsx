import { Sparkles } from "lucide-react";
import {
  DEFAULT_BASE_PAYOUT_TOMAN,
  DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
  MIN_PAYOUT_TOMAN,
  REVIEW_SLA_HOURS,
} from "@/lib/earn";
import { cn, formatToman, formatTomanCompact } from "@/lib/utils";

/** Factual program highlights on an endless lime strip. No fake social proof. */
export function FactTicker({ className }: { className?: string }) {
  const facts = [
    `پاداش پایه هر ریل ${formatTomanCompact(DEFAULT_BASE_PAYOUT_TOMAN)} تومان`,
    `سقف پاداش هر ریل ${formatTomanCompact(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN)} تومان`,
    `بررسی حداکثر ${formatToman(REVIEW_SLA_HOURS)} ساعته`,
    "پاداش بازدید در روز هفتم",
    `حداقل برداشت ${formatTomanCompact(MIN_PAYOUT_TOMAN)} تومان`,
    "واریز مستقیم به شبا یا کارت",
    "بدون هزینه عضویت",
    "ساخت محتوا با هوش مصنوعی بنانا",
  ];
  const track = [...facts, ...facts];

  return (
    <div
      className={cn(
        "earn-ticker overflow-hidden rounded-2xl border border-brand/30 bg-brand py-2.5 text-brand-ink",
        className
      )}
      aria-label="نکات برنامه"
    >
      <div className="earn-marquee gap-8" dir="ltr">
        {track.map((fact, index) => (
          <span
            key={`${fact}-${index}`}
            className="inline-flex shrink-0 items-center gap-2 text-xs font-bold sm:text-sm"
            dir="rtl"
          >
            <Sparkles className="size-3.5" />
            {fact}
          </span>
        ))}
      </div>
    </div>
  );
}

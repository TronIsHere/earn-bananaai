import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { brandCtaGlow, brandGlowPanel } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { SectionBadge } from "@/components/section-badge";

export function GrowthBanner() {
  return (
    <div className={cn(brandGlowPanel, "p-6 sm:p-8")}>
      <div
        className="earn-blob-slow pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-brand/10 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-3">
        <SectionBadge icon={TrendingUp}>پاداش بازدید</SectionBadge>
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">
          بازدید بیشتر، پاداش بیشتر
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-white/55">
          بعد از تأیید پست، پاداش پایه به کیف پولت می‌آید. در روز هفتم، اگر
          بازدید به سطح‌های همان کمپین برسد، پاداش اضافه هم واریز می‌شود.
        </p>
        <Link href="/posts" className={cn(brandCtaGlow, "px-5 py-2.5 text-sm")}>
          ارسال ویدیوی جدید
        </Link>
      </div>
    </div>
  );
}

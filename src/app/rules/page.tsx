import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ScrollText,
  UserRoundCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { SectionBadge } from "@/components/section-badge";
import {
  brandCtaGhost,
  brandGlassCard,
  brandHeadlineGradient,
  brandIconBg,
} from "@/lib/brand";
import {
  FIXABLE_REJECT_REASONS,
  MIN_PAYOUT_TOMAN,
  REVIEW_SLA_HOURS,
  REVIEW_SLA_LABEL,
} from "@/lib/earn";
import { cn, formatToman } from "@/lib/utils";

export const metadata: Metadata = {
  title: "قوانین برنامه",
};

const joinRules = [
  "ورود با شماره موبایل ایران کافی است؛ برای شرکت در کمپین باید پیج اینستاگرام را تأیید کنی.",
  "کد سفیر بنانا را در بیوی اینستاگرام بگذار تا حسابت بررسی شود.",
  "هر پیج اینستاگرام فقط برای یک نفر قابل استفاده است.",
  "فقط کمپین‌های فعال و قبل از مهلت را می‌توانی ارسال کنی.",
];

const payRules = [
  `ارسال را دستی بررسی می‌کنیم. نتیجه حداکثر ${formatToman(REVIEW_SLA_HOURS)} ساعت بعد اعلام می‌شود.`,
  "اگر پست تأیید شود، پاداش پایه همان‌وقت به کیف پولت می‌رود.",
  "پاداش بازدید حدود ۷ روز بعد، بر اساس بازدید واقعی همان پست اضافه می‌شود.",
  "واریز نقدی جداست: بعد از رسیدن به حداقل برداشت، شبا یا کارت را ثبت کن تا دستی واریز شود.",
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <SectionBadge icon={ScrollText}>شفاف و کوتاه</SectionBadge>
        <h1 className={cn("mt-2 text-2xl font-bold", brandHeadlineGradient)}>
          قوانین برنامه
        </h1>
        <p className="mt-1 text-sm text-white/55">
          چه کسانی عضو می‌شوند، چه زمانی پول می‌دهیم، چه زمانی رد می‌کنیم، و
          حداقل برداشت چقدر است. آموزش گام‌به‌گام در{" "}
          <Link href="/help" className="text-brand hover:text-brand-soft">
            مرکز راهنما
          </Link>{" "}
          است.
        </p>
      </header>

      <RuleCard icon={UserRoundCheck} title="چه کسانی می‌توانند عضو شوند؟">
        <ul className="space-y-2">
          {joinRules.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-white/65"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))}
        </ul>
      </RuleCard>

      <RuleCard
        icon={Banknote}
        title="چه زمانی پرداخت می‌کنیم؟"
        badge={REVIEW_SLA_LABEL}
      >
        <ul className="space-y-2">
          {payRules.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-white/65"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))}
        </ul>
      </RuleCard>

      <RuleCard icon={XCircle} title="چه زمانی رد می‌کنیم؟">
        <p className="text-sm leading-relaxed text-white/65">
          ایرادهای قابل اصلاح مثل هشتگ جا مانده، یک‌بار فرصت اصلاح همان پست را
          دارند. تقلب، محتوای اشتباه، یا رد بعد از این فرصت، نهایی است.
        </p>
        <p className="mt-3 text-xs font-semibold text-white/45">
          نمونه‌های قابل اصلاح
        </p>
        <ul className="mt-2 space-y-2">
          {FIXABLE_REJECT_REASONS.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-white/65"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-rose-400" />
              {item}
            </li>
          ))}
        </ul>
      </RuleCard>

      <RuleCard icon={Wallet} title="حداقل برداشت">
        <p className="text-3xl font-black text-white">
          {formatToman(MIN_PAYOUT_TOMAN)}
          <span className="mr-1 text-sm font-normal text-white/40">تومان</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          کمتر از این مبلغ نمی‌توانی درخواست واریز بدهی. معمولاً با یک ویدیوی
          تأییدشده به این کف می‌رسی.
        </p>
        <div className="mt-4">
          <Link href="/billing" className={cn(brandCtaGhost, "px-4 py-2 text-sm")}>
            رفتن به تاریخچه مالی
          </Link>
        </div>
      </RuleCard>
    </div>
  );
}

function RuleCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(brandGlassCard, "p-5 sm:p-6")}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-2xl",
            brandIconBg
          )}
        >
          <Icon className="size-5 text-brand" />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {badge ? (
          <span className="rounded-full border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

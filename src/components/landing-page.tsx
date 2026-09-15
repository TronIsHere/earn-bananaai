import Link from "next/link";
import {
  ArrowDown,
  ArrowUpLeft,
  BadgeCheck,
  Banknote,
  ChevronDown,
  Clock3,
  Flame,
  Landmark,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { EarningsCalculator } from "@/components/earnings-calculator";
import { FactTicker } from "@/components/fact-ticker";
import { HowItWorks } from "@/components/how-it-works";
import { LoginForm } from "@/components/login-form";
import { PayoutLadder } from "@/components/payout-ladder";
import { SectionBadge } from "@/components/section-badge";
import {
  brandCta,
  brandCtaGhost,
  brandGlassCard,
  brandGlassCardHover,
  brandLimePanel,
  brandMeshPanel,
  brandCtaInk,
  sectionLead,
  sectionTitle,
} from "@/lib/brand";
import {
  DEFAULT_BASE_PAYOUT_TOMAN,
  DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
  DEFAULT_VIEW_BONUS_TIERS,
  MIN_PAYOUT_TOMAN,
  REVIEW_SLA_HOURS,
} from "@/lib/earn";
import { cn, formatToman, formatTomanCompact } from "@/lib/utils";

export type LandingCampaignTeaser = {
  id: string;
  title: string;
  basePayoutToman: number;
  maxPayoutPerVideoToman: number;
  trending?: boolean;
};

const trustPoints = [
  {
    icon: Banknote,
    title: "پرداخت شفاف",
    text: "قبل از شروع دقیقاً می‌دانی هر ریل چقدر می‌ارزد. پایه ثابت است و پاداش بازدید پله‌ای اضافه می‌شود.",
  },
  {
    icon: Clock3,
    title: `بررسی ${formatToman(REVIEW_SLA_HOURS)} ساعته`,
    text: "هر ارسال را تیم ما دستی بررسی می‌کند و زمان دقیق اعلام نتیجه را همان لحظه می‌بینی.",
  },
  {
    icon: Landmark,
    title: "واریز به شبا یا کارت",
    text: `بعد از رسیدن به ${formatTomanCompact(MIN_PAYOUT_TOMAN)} تومان، درخواست واریز بده و پول را مستقیم بگیر.`,
  },
  {
    icon: ShieldCheck,
    title: "بدون هزینه و واسطه",
    text: "عضویت رایگان است. فقط یک پیج اینستاگرام تأییدشده لازم داری.",
  },
];

const faqs = [
  {
    q: "دقیقاً چه کاری باید بکنم؟",
    a: "با ابزارهای هوش مصنوعی بنانا یک ریل کوتاه می‌سازی، طبق چک‌لیست کمپین (هشتگ و منشن) در اینستاگرام منتشر می‌کنی و لینک پست را همین‌جا ثبت می‌کنی. همین.",
  },
  {
    q: "چقدر و کی پول می‌گیرم؟",
    a: `بعد از تأیید پست (حداکثر ${formatToman(REVIEW_SLA_HOURS)} ساعت) پاداش پایه به کیف پولت می‌آید. روز هفتم، بازدید ریل ثبت می‌شود و اگر به پله‌های پاداش برسد، مبلغ اضافه هم واریز می‌شود.`,
  },
  {
    q: "چطور پول را نقد کنم؟",
    a: `وقتی موجودی کیف پولت به ${formatTomanCompact(MIN_PAYOUT_TOMAN)} تومان برسد، شبا یا شماره کارتت را ثبت می‌کنی و دستی برایت واریز می‌کنیم.`,
  },
  {
    q: "چند تا ریل می‌توانم بفرستم؟",
    a: "هر کمپین سقف ارسال مشخصی دارد (معمولاً ۳ ریل). با چند کمپین فعال می‌توانی درآمدت را چند برابر کنی.",
  },
  {
    q: "اگر پستم رد شود چه می‌شود؟",
    a: "اگر ایراد کوچکی مثل هشتگ جا مانده باشد، یک بار فرصت اصلاح همان پست را داری. فقط تقلب یا محتوای بی‌ربط نهایی رد می‌شود.",
  },
];

export function LandingPage({
  campaigns,
}: {
  campaigns: LandingCampaignTeaser[];
}) {
  const tiers = [...DEFAULT_VIEW_BONUS_TIERS];

  return (
    <div className="space-y-14 pb-10 sm:space-y-20">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-7">
          <div className="earn-rise" style={{ ["--delay" as string]: "0ms" }}>
            <SectionBadge icon={Sparkles}>برنامه رسمی کسب درآمد بنانا</SectionBadge>
          </div>

          <h1
            className="earn-rise max-w-2xl text-[1.9rem] font-black leading-[1.3] text-white sm:text-4xl sm:leading-[1.25] xl:text-5xl xl:leading-[1.2]"
            style={{ ["--delay" as string]: "80ms" }}
          >
            <span className="block">با هوش مصنوعی ویدیو بساز،</span>
            <span className="block">در اینستاگرام پست کن،</span>
            <span className="block text-brand">پول بگیر.</span>
          </h1>

          <p
            className={cn("earn-rise max-w-xl", sectionLead)}
            style={{ ["--delay" as string]: "160ms" }}
          >
            برای هر ریل تأییدشده{" "}
            <strong className="text-white">
              {formatTomanCompact(DEFAULT_BASE_PAYOUT_TOMAN)} تومان
            </strong>{" "}
            پاداش پایه می‌گیری و با بازدید بیشتر تا{" "}
            <strong className="text-brand">
              {formatTomanCompact(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN)} تومان
            </strong>{" "}
            برای هر ویدیو. بدون هزینه، بدون واسطه، واریز مستقیم به کارتت.
          </p>

          <div
            className="earn-rise flex flex-wrap items-center gap-3"
            style={{ ["--delay" as string]: "240ms" }}
          >
            <a href="#login" className={cn(brandCta, "px-6 py-3 text-sm sm:text-base")}>
              <Wand2 className="size-4" />
              شروع کسب درآمد
            </a>
            <a href="#how" className={cn(brandCtaGhost, "px-5 py-3 text-sm sm:text-base")}>
              چطور کار می‌کند؟
              <ArrowDown className="size-4" />
            </a>
          </div>

          <ul
            className="earn-rise flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/50 sm:text-sm"
            style={{ ["--delay" as string]: "320ms" }}
          >
            {[
              `بررسی ${formatToman(REVIEW_SLA_HOURS)} ساعته`,
              "واریز به شبا یا کارت",
              "عضویت رایگان",
            ].map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-4 text-brand" />
                {item}
              </li>
            ))}
          </ul>

          {/* Hero calculator: the "money" moment */}
          <div
            className={cn(brandMeshPanel, "earn-rise p-5 sm:p-7")}
            style={{ ["--delay" as string]: "400ms" }}
          >
            <div className="earn-grid pointer-events-none absolute inset-0" aria-hidden />
            <div
              className="earn-blob pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-brand/15 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <span className="relative flex size-2 rounded-full bg-brand text-brand">
                    <span className="earn-live absolute inset-0 rounded-full" />
                  </span>
                  ماشین‌حساب درآمد
                </span>
                <span className="text-[11px] text-white/45">
                  اسلایدر را بکش و ببین هر ریل چقدر می‌ارزد
                </span>
              </div>
              <EarningsCalculator
                variant="hero"
                basePayoutToman={DEFAULT_BASE_PAYOUT_TOMAN}
                viewBonusTiers={tiers}
                maxPayoutPerVideoToman={DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN}
              />
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:col-span-5">
          <div
            className="earn-rise"
            style={{ ["--delay" as string]: "200ms" }}
          >
            <LoginForm stayVisibleWhileLoading callbackUrl="/" />
            <p className="mt-4 text-center text-xs text-white/40">
              با ورود،{" "}
              <Link href="/rules" className="text-white/60 hover:text-brand">
                قوانین برنامه
              </Link>{" "}
              را می‌پذیری.{" "}
              <Link href="/help" className="text-white/60 hover:text-brand">
                راهنمای کامل
              </Link>
            </p>
          </div>
        </div>
      </section>

      <FactTicker />

      {/* ------------------------------------------------------------------ */}
      {/* How it works                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section id="how" className="scroll-mt-24 space-y-6">
        <div className="max-w-2xl">
          <SectionBadge icon={Wand2}>چهار قدم تا اولین واریز</SectionBadge>
          <h2 className={cn("mt-3", sectionTitle)}>چطور کار می‌کند؟</h2>
          <p className={cn("mt-2", sectionLead)}>
            بنانا ابزار ساخت ویدیو با هوش مصنوعی است. تو با آن ریل می‌سازی،
            منتشر می‌کنی و ما بابت هر ریل تأییدشده به تو پول می‌دهیم.
          </p>
        </div>
        <HowItWorks />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Payout ladder                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className={cn(brandLimePanel, "p-6 sm:p-10")}>
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/30 blur-3xl"
          aria-hidden
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink/10 px-3 py-1 text-[11px] font-bold text-brand-ink">
              <Flame className="size-3.5" />
              بازدید بیشتر، پول بیشتر
            </span>
            <h2 className="text-2xl font-black leading-tight text-brand-ink sm:text-4xl">
              هر ریل از{" "}
              {formatTomanCompact(DEFAULT_BASE_PAYOUT_TOMAN)} تا{" "}
              {formatTomanCompact(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN)} تومان
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-brand-ink/75 sm:text-base">
              پاداش پایه با تأیید پست واریز می‌شود. روز هفتم، بازدید ریل را ثبت
              می‌کنیم و هر پله‌ای که رد کرده باشی، پاداشش را روی هم می‌گیری تا سقف
              هر ویدیو.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="#login" className={cn(brandCtaInk, "px-5 py-2.5 text-sm")}>
                شروع کن
                <ArrowUpLeft className="size-4" />
              </a>
              <Link
                href="/rules"
                className="inline-flex items-center gap-1 px-2 py-2.5 text-sm font-semibold text-brand-ink/70 hover:text-brand-ink"
              >
                قوانین پرداخت
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-brand-ink/10 bg-[#0b0c0b] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-5">
            <div className="mb-3 flex items-center justify-between text-xs text-white/50">
              <span className="font-semibold text-white">پله‌های پاداش یک ریل</span>
              <span>مبلغ‌ها مجموع دریافتی است</span>
            </div>
            <PayoutLadder
              basePayoutToman={DEFAULT_BASE_PAYOUT_TOMAN}
              viewBonusTiers={tiers}
              maxPayoutPerVideoToman={DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Active campaigns                                                    */}
      {/* ------------------------------------------------------------------ */}
      {campaigns.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionBadge icon={Flame}>همین حالا فعال</SectionBadge>
              <h2 className={cn("mt-3", sectionTitle)}>کمپین‌های باز</h2>
            </div>
            <a href="#login" className="text-sm font-semibold text-brand hover:text-brand-soft">
              ورود و مشاهده همه
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((campaign) => (
              <a
                key={campaign.id}
                href="#login"
                className={cn(
                  brandGlassCard,
                  brandGlassCardHover,
                  "group relative overflow-hidden p-5"
                )}
              >
                {campaign.trending && (
                  <span className="absolute left-0 top-0 inline-flex items-center gap-1 rounded-bl-2xl bg-brand px-3 py-1 text-[11px] font-bold text-brand-ink">
                    <Flame className="size-3" />
                    داغ
                  </span>
                )}
                <h3 className="pl-16 text-base font-bold text-white">{campaign.title}</h3>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-white/45">درآمد هر ریل</div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="earn-money text-2xl text-white">
                        {formatTomanCompact(campaign.basePayoutToman)}
                      </span>
                      <span className="text-base font-medium text-white/35">تا</span>
                      <span className="earn-money text-2xl text-brand">
                        {formatTomanCompact(campaign.maxPayoutPerVideoToman)}
                      </span>
                      <span className="text-xs font-medium text-white/40">تومان</span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/12 px-3 py-1.5 text-xs font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-brand-ink">
                    ورود و شرکت
                    <ArrowUpLeft className="size-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Trust                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-6">
        <div className="max-w-2xl">
          <SectionBadge icon={ShieldCheck}>چرا بنانا</SectionBadge>
          <h2 className={cn("mt-3", sectionTitle)}>قوانین ساده، پول واقعی</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className={cn(brandGlassCard, "p-5")}>
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{point.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                  {point.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionBadge>سؤال‌های رایج</SectionBadge>
          <h2 className={cn("mt-3", sectionTitle)}>هر چیزی که باید بدانی</h2>
          <p className={cn("mt-2", sectionLead)}>
            جواب کامل‌تر را در{" "}
            <Link href="/help" className="text-brand hover:text-brand-soft">
              مرکز راهنما
            </Link>{" "}
            ببین.
          </p>
        </div>
        <div className="space-y-2 lg:col-span-8">
          {faqs.map((item, index) => (
            <details
              key={item.q}
              className={cn(brandGlassCard, "earn-details group px-5 py-1")}
              open={index === 0}
            >
              <summary className="flex items-center justify-between gap-3 py-3.5 text-sm font-semibold text-white">
                {item.q}
                <ChevronDown className="earn-details-chevron size-4 shrink-0 text-white/40 transition-transform" />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-white/60">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className={cn(brandMeshPanel, "p-8 text-center sm:p-12")}>
        <div className="earn-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-xl space-y-4">
          <h2 className="text-2xl font-black text-white sm:text-4xl">
            اولین ریلت می‌تواند{" "}
            <span className="text-brand">
              {formatTomanCompact(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN)} تومان
            </span>{" "}
            بیارزد
          </h2>
          <p className={sectionLead}>
            ورود با شماره موبایل کمتر از یک دقیقه طول می‌کشد.
          </p>
          <a href="#login" className={cn(brandCta, "px-7 py-3.5 text-base")}>
            <Wand2 className="size-4" />
            شروع کسب درآمد
          </a>
        </div>
      </section>
    </div>
  );
}

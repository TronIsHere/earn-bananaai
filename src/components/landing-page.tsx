import Link from "next/link";
import {
  ArrowUpLeft,
  Banknote,
  Clock,
  Flame,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { SectionBadge } from "@/components/section-badge";
import { StatCard } from "@/components/stat-card";
import {
  brandCta,
  brandGlassCard,
  brandGlassCardHover,
  brandGlowPanel,
  brandIconBg,
} from "@/lib/brand";
import {
  DEFAULT_BASE_PAYOUT_TOMAN,
  DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
  REVIEW_SLA_HOURS,
} from "@/lib/earn";
import { cn, formatToman } from "@/lib/utils";

export type LandingCampaignTeaser = {
  id: string;
  title: string;
  basePayoutToman: number;
  maxPayoutPerVideoToman: number;
  trending?: boolean;
};

const steps = [
  {
    step: "۰۱",
    icon: ShieldCheck,
    title: "ورود و تأیید",
    text: "با موبایل وارد شو و پیج اینستاگرام را وصل کن.",
  },
  {
    step: "۰۲",
    icon: Send,
    title: "ساخت و انتشار",
    text: "محتوای بنانا را پست کن و لینک را همین‌جا ثبت کن.",
  },
  {
    step: "۰۳",
    icon: Banknote,
    title: "دریافت پول",
    text: "بعد از بررسی، پاداش به کیف پولت واریز می‌شود.",
  },
];

export function LandingPage({
  campaigns,
}: {
  campaigns: LandingCampaignTeaser[];
}) {
  return (
    <div className="space-y-8 pb-4">
      <section className="grid items-start gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="space-y-5 lg:col-span-3">
          <div>
            <SectionBadge icon={Sparkles}>برنامه رسمی کسب درآمد</SectionBadge>
            <h1 className="mt-3 max-w-xl text-2xl font-extrabold text-white sm:text-4xl">
              داشبورد درآمدت از{" "}
              <span className="text-brand">کمپین بنانا</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              محتوای ساخته‌شده با بنانا را در اینستاگرام منتشر کن، لینک پست را
              ثبت کن و بر اساس بازدید پاداش نقدی بگیر.
            </p>
            <a
              href="#login"
              className={cn(brandCta, "mt-4 inline-flex px-5 py-2.5 text-sm lg:hidden")}
            >
              ورود / ثبت‌نام
            </a>
          </div>

          <div className={cn(brandGlowPanel, "p-4 sm:p-5")}>
            <div
              className="earn-blob pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-brand/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2 border-b border-white/8 pb-3">
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-white/20" />
                <span className="size-2 rounded-full bg-brand" />
                <span className="mr-2 text-xs text-white/40">
                  پیش‌نمایش داشبورد
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={Banknote}
                  label="پاداش پایه هر ویدیو"
                  value={formatToman(DEFAULT_BASE_PAYOUT_TOMAN)}
                  suffix="تومان"
                  highlight
                />
                <StatCard
                  icon={Sparkles}
                  label="سقف پاداش هر ویدیو"
                  value={formatToman(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN)}
                  suffix="تومان"
                />
                <StatCard
                  icon={Clock}
                  label="زمان بررسی ارسال"
                  value={formatToman(REVIEW_SLA_HOURS)}
                  suffix="ساعت"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {steps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className={cn(brandGlassCard, "flex gap-3 p-3.5")}
                    >
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          brandIconBg
                        )}
                      >
                        <Icon className="size-4 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-white/25">
                            {item.step}
                          </span>
                          <h3 className="truncate text-sm font-bold text-white">
                            {item.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-white/50">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {campaigns.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-white/40">
                    کمپین‌های فعال
                  </div>
                  <div className="grid gap-2">
                    {campaigns.map((campaign) => (
                      <a
                        key={campaign.id}
                        href="#login"
                        className={cn(
                          brandGlassCard,
                          brandGlassCardHover,
                          "flex items-center justify-between gap-3 p-3.5"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {campaign.trending && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-ink">
                                <Flame className="size-3" />
                                داغ
                              </span>
                            )}
                            <h3 className="truncate text-sm font-bold text-white">
                              {campaign.title}
                            </h3>
                          </div>
                          <p className="mt-1 text-xs text-white/45">
                            پایه {formatToman(campaign.basePayoutToman)} · سقف{" "}
                            {formatToman(campaign.maxPayoutPerVideoToman)} تومان
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
                          ورود و ارسال
                          <ArrowUpLeft className="size-3.5" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:col-span-2">
          <LoginForm stayVisibleWhileLoading callbackUrl="/" />
          <p className="mt-4 text-center text-xs text-white/40">
            با ورود،{" "}
            <Link href="/rules" className="text-white/60 hover:text-brand">
              قوانین برنامه
            </Link>{" "}
            را می‌پذیری.{" "}
            <Link href="/help" className="text-white/60 hover:text-brand">
              راهنما
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CircleHelp,
  Loader2,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign-card";
import { TrendingBanner } from "@/components/trending-banner";
import { GrowthBanner } from "@/components/growth-banner";
import { StatCard } from "@/components/stat-card";
import { StepCard } from "@/components/step-card";
import { SectionBadge } from "@/components/section-badge";
import { useStore } from "@/components/store-provider";
import { usePublicCampaigns } from "@/hooks/use-public-campaigns";
import { brandCta, brandCtaGhost, brandGlassCard, brandGlowPanel } from "@/lib/brand";
import { cn, formatToman } from "@/lib/utils";

export function DashboardHome() {
  const { ready, state } = useStore();
  const { campaigns: publicCampaigns, loading: campaignsLoading } =
    usePublicCampaigns();

  const campaigns = publicCampaigns;
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function loadCount() {
      try {
        const res = await fetch("/api/user/earn/submissions");
        const data = (await res.json()) as {
          submissionCount?: number;
          submissions?: unknown[];
        };
        if (cancelled || !res.ok) return;
        setSubmissionCount(
          data.submissionCount ?? data.submissions?.length ?? 0
        );
      } catch {
        if (!cancelled) setSubmissionCount(0);
      }
    }
    void loadCount();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const trendingCampaign = useMemo(
    () => campaigns.find((c) => c.trending) || null,
    [campaigns]
  );

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className={cn(brandGlowPanel, "p-6 sm:p-10")}>
        <div
          className="earn-blob pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <div
          className="earn-blob-slow pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-brand/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-4">
          <SectionBadge icon={Sparkles}>برنامه رسمی کسب درآمد</SectionBadge>
          <h1 className="max-w-2xl text-2xl font-extrabold text-white sm:text-4xl">
            سلام {state.profile.firstName}، به{" "}
            <span className="text-brand">کمپین بنانا</span> خوش آمدی
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            محتوای ساخته‌شده با بنانا را در اینستاگرام منتشر کن، لینک پست را ثبت
            کن و بر اساس بازدید، پاداش نقدی بگیر.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a href="#campaigns" className={cn(brandCta, "px-5 py-2.5 text-sm")}>
              <Rocket className="size-4" />
              مشاهده کمپین‌های فعال
            </a>
            <Link href="/posts" className={cn(brandCtaGhost, "px-5 py-2.5 text-sm")}>
              <Send className="size-4" />
              ارسال ویدیوی جدید
            </Link>
            <Link href="/help" className={cn(brandCtaGhost, "px-5 py-2.5 text-sm")}>
              <CircleHelp className="size-4" />
              راهنمای کاربران
            </Link>
          </div>
        </div>
      </section>

      {state.profile.instagramStatus !== "verified" && (
        <Link
          href="/profile"
          className={cn(
            brandGlassCard,
            "flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand/30"
          )}
        >
          <div>
            <div className="text-sm font-semibold text-white">
              اینستاگرامت را تأیید کن
            </div>
            <p className="mt-1 text-xs text-white/50">
              کد سفیر بنانا را در بیو بگذار تا بتوانی در کمپین‌ها شرکت کنی.
            </p>
          </div>
          <span className={cn(brandCtaGhost, "px-4 py-2 text-sm")}>
            رفتن به تأیید
          </span>
        </Link>
      )}

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="موجودی کیف پول"
          value={formatToman(state.wallet.available)}
          suffix="تومان"
          highlight
        />
        <StatCard
          icon={Banknote}
          label="مجموع درآمد"
          value={formatToman(state.wallet.lifetimeEarned)}
          suffix="تومان"
        />
        <StatCard
          icon={Send}
          label="ارسال‌های من"
          value={
            submissionCount === null ? "—" : formatToman(submissionCount)
          }
        />
      </section>

      {/* How it works */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionBadge icon={ShieldCheck}>سه قدم ساده</SectionBadge>
            <h2 className="mt-2 text-xl font-bold text-white">
              چطور با بنانا درآمد کسب کنیم؟
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/help"
              className="font-semibold text-brand hover:text-brand-soft"
            >
              راهنمای کامل
            </Link>
            <Link
              href="/rules"
              className="text-white/45 transition-colors hover:text-brand"
            >
              قوانین برنامه
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StepCard
            step={1}
            icon={ShieldCheck}
            title="ورود و تأیید"
            description="نام کاربری اینستاگرام را وارد کن، کد سفیر بنانا را در بیو بگذار. بررسی حداکثر ۴۸ ساعت طول می‌کشد."
          />
          <StepCard
            step={2}
            icon={Send}
            title="ساخت و انتشار"
            description="محتوای ساخته‌شده با بنانا را منتشر کن و لینک پست را در همین‌جا ثبت کن."
          />
          <StepCard
            step={3}
            icon={Banknote}
            title="دریافت پول"
            description="بعد از بررسی (حداکثر ۴۸ ساعت) پاداش پایه به کیف پولت واریز می‌شود. پاداش بازدید در روز هفتم اضافه می‌گردد."
          />
        </div>
      </section>

      {/* Growth banner */}
      <GrowthBanner />

      {/* Trending campaign spotlight */}
      {trendingCampaign && <TrendingBanner campaign={trendingCampaign} />}

      {/* Campaigns */}
      <section id="campaigns" className="space-y-4 scroll-mt-20">
        <h2 className="text-xl font-bold text-white">کمپین‌های فعال</h2>

        {campaignsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/45">
            فعلاً کمپین فعالی نیست.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                href={`/posts?campaign=${campaign.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

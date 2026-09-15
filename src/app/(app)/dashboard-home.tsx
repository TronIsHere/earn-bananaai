"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, Flame, Loader2, Wand2 } from "lucide-react";
import Link from "next/link";
import { CampaignCard } from "@/components/campaign-card";
import { HowItWorks } from "@/components/how-it-works";
import {
  OnboardingChecklist,
  buildOnboardingSteps,
} from "@/components/onboarding-checklist";
import { SectionBadge } from "@/components/section-badge";
import { useStore } from "@/components/store-provider";
import {
  SubmissionStatusBadge,
  SubmissionTimeline,
} from "@/components/submission-timeline";
import { WalletHero } from "@/components/wallet-hero";
import { usePublicCampaigns } from "@/hooks/use-public-campaigns";
import { brandGlassCard, brandGlassCardHover, sectionTitle } from "@/lib/brand";
import type { UserSubmissionJson } from "@/lib/earn-submissions-types";
import { cn, formatDate, formatToman } from "@/lib/utils";

export function DashboardHome() {
  const { ready, state } = useStore();
  const { campaigns, loading: campaignsLoading } = usePublicCampaigns();
  const [submissions, setSubmissions] = useState<UserSubmissionJson[] | null>(null);
  const [hasPendingPayout, setHasPendingPayout] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      try {
        const [subRes, payRes] = await Promise.all([
          fetch("/api/user/earn/submissions"),
          fetch("/api/user/earn/payout-request"),
        ]);
        const subData = (await subRes.json()) as {
          submissions?: UserSubmissionJson[];
        };
        const payData = (await payRes.json().catch(() => ({}))) as {
          payouts?: { status: string }[];
        };
        if (cancelled) return;
        setSubmissions(subRes.ok ? (subData.submissions ?? []) : []);
        setHasPendingPayout(
          Boolean(payData.payouts?.some((row) => row.status === "pending"))
        );
      } catch {
        if (!cancelled) setSubmissions([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const pending = useMemo(
    () => (submissions ?? []).filter((s) => s.status === "pending"),
    [submissions]
  );
  const pendingToman = pending.reduce((sum, s) => sum + s.basePayoutToman, 0);
  const recent = (submissions ?? []).slice(0, 3);

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => Number(b.trending) - Number(a.trending)),
    [campaigns]
  );

  const steps = buildOnboardingSteps({
    instagramStatus: state.profile.instagramStatus,
    submissionCount: submissions?.length ?? 0,
    lifetimeEarned: state.wallet.lifetimeEarned,
  });
  const onboarded = steps.every((s) => s.state === "done");

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-white/50">خوش برگشتی</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            سلام {state.profile.firstName || "رفیق"} 👋
          </h1>
        </div>
        <Link
          href="/help"
          className="text-sm text-white/45 transition-colors hover:text-brand"
        >
          راهنمای کامل
        </Link>
      </header>

      <WalletHero
        wallet={state.wallet}
        pendingToman={pendingToman}
        pendingCount={pending.length}
        hasPendingPayout={hasPendingPayout}
      />

      {submissions !== null && <OnboardingChecklist steps={steps} />}

      {/* Campaigns */}
      <section id="campaigns" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionBadge icon={Flame}>همین حالا فعال</SectionBadge>
            <h2 className={cn("mt-3", sectionTitle)}>کمپین‌های باز</h2>
            <p className="mt-1 text-sm text-white/50">
              یک کمپین انتخاب کن، ریل بساز و لینکش را ثبت کن.
            </p>
          </div>
          {campaigns.length > 0 && (
            <span className="text-xs text-white/40">
              {formatToman(campaigns.length)} کمپین
            </span>
          )}
        </div>

        {campaignsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : sortedCampaigns.length === 0 ? (
          <div className={cn(brandGlassCard, "px-6 py-14 text-center")}>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand">
              <Wand2 className="size-5" />
            </div>
            <h3 className="mt-4 font-bold text-white">فعلاً کمپین بازی نداریم</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/50">
              کمپین‌های جدید همین‌جا نمایش داده می‌شوند. تا آن موقع پیجت را تأیید
              کن تا آماده باشی.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                href={`/posts?campaign=${campaign.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent submissions */}
      {recent.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className={sectionTitle}>آخرین ارسال‌ها</h2>
            <Link
              href="/posts"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-soft"
            >
              همه ارسال‌ها
              <ArrowUpLeft className="size-4" />
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {recent.map((sub) => (
              <Link
                key={sub.id}
                href="/posts"
                className={cn(brandGlassCard, brandGlassCardHover, "block p-4")}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-white">
                    {sub.campaignTitle}
                  </h3>
                  <SubmissionStatusBadge status={sub.status} className="shrink-0" />
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                  {formatDate(sub.createdAt)}
                </div>
                <SubmissionTimeline status={sub.status} className="mt-4" />
                <div className="mt-4 flex items-baseline justify-between border-t border-white/6 pt-3 text-xs text-white/50">
                  <span>پاداش این ریل</span>
                  <span className="earn-money text-base text-white">
                    {formatToman(sub.basePayoutToman + sub.bonusToman)}
                    <span className="mr-1 text-[10px] font-medium text-white/40">تومان</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works (only once the checklist is gone, so the page never repeats itself) */}
      {onboarded && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className={sectionTitle}>یادآوری مسیر</h2>
            <Link href="/rules" className="text-sm text-white/45 hover:text-brand">
              قوانین برنامه
            </Link>
          </div>
          <HowItWorks compact />
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowUpLeft, ChevronDown, Clock, Flame, ListChecks } from "lucide-react";
import type { Campaign, Platform } from "@/lib/types";
import { brandCta, brandGlassCard, brandGlassCardHover } from "@/lib/brand";
import { cn, formatDate, formatToman, formatTomanCompact } from "@/lib/utils";
import { InstagramIcon } from "@/components/platform-icons";
import { CampaignBudgetMeter } from "@/components/campaign-budget";
import {
  CampaignRequirements,
  campaignHasRequirements,
} from "@/components/campaign-requirements";
import { EarningsCalculator } from "@/components/earnings-calculator";

export function PlatformBadge({ platform = "instagram" }: { platform?: Platform } = {}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-pink-500/15 px-2 py-0.5 text-[11px] text-pink-300"
      data-platform={platform}
    >
      <InstagramIcon className="size-3" />
      اینستاگرام
    </span>
  );
}

export function CampaignCard({
  campaign,
  href,
}: {
  campaign: Campaign;
  href?: string;
}) {
  const hasRequirements = campaignHasRequirements(campaign);
  const requirementCount =
    (campaign.requiredHashtags?.length ?? 0) +
    (campaign.requiredMentions?.length ?? 0) +
    (campaign.requirementsChecklist?.length ?? 0);

  return (
    <article
      className={cn(
        brandGlassCard,
        brandGlassCardHover,
        "relative flex flex-col overflow-hidden",
        campaign.trending && "border-brand/30"
      )}
    >
      {campaign.trending && (
        <div className="absolute left-0 top-0 z-10 inline-flex items-center gap-1 rounded-bl-2xl bg-brand px-3 py-1 text-[11px] font-bold text-brand-ink">
          <Flame className="size-3" />
          داغ‌ترین کمپین
        </div>
      )}

      {/* Header */}
      <div className="p-5 pb-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PlatformBadge platform={campaign.platform} />
          {campaign.status === "active" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cash/12 px-2 py-0.5 text-[11px] text-cash">
              <span className="relative flex size-1.5 rounded-full bg-cash">
                <span className="earn-live absolute inset-0 rounded-full" />
              </span>
              فعال
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50">
              {campaign.status}
            </span>
          )}
          {campaign.maxSubmissionsPerUser > 0 && (
            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-white/50">
              تا {formatToman(campaign.maxSubmissionsPerUser)} ریل برای هر نفر
            </span>
          )}
        </div>
        <h3 className="text-lg font-extrabold text-white">{campaign.title}</h3>

        {/* Payout range: the one number that matters */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs text-white/45">درآمد هر ریل</span>
          <span className="earn-money text-2xl text-white sm:text-3xl">
            {formatTomanCompact(campaign.basePayoutToman)}
          </span>
          <span className="text-sm font-medium text-white/35">تا</span>
          <span className="earn-money text-2xl text-brand sm:text-3xl">
            {formatTomanCompact(campaign.maxPayoutPerVideoToman)}
          </span>
          <span className="text-xs font-medium text-white/40">تومان</span>
        </div>
      </div>

      {/* Calculator */}
      <div className="px-5">
        <EarningsCalculator
          basePayoutToman={campaign.basePayoutToman}
          viewBonusTiers={campaign.viewBonusTiers}
          maxPayoutPerVideoToman={campaign.maxPayoutPerVideoToman}
        />
      </div>

      {/* Requirements (collapsed so the card stays scannable) */}
      {hasRequirements && (
        <details className="earn-details group mx-5 mb-3 rounded-xl border border-white/8 bg-black/20">
          <summary className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-3.5 text-brand" />
              شرایط کمپین
              {requirementCount > 0 && (
                <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-white/60">
                  {formatToman(requirementCount)} مورد
                </span>
              )}
            </span>
            <ChevronDown className="earn-details-chevron size-4 text-white/40 transition-transform" />
          </summary>
          <div className="px-3 pb-3">
            <CampaignRequirements campaign={campaign} compact />
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="mt-auto space-y-3 border-t border-white/6 bg-black/15 p-5 pt-4">
        <CampaignBudgetMeter
          spentBudgetToman={campaign.spentBudgetToman}
          totalBudgetToman={campaign.totalBudgetToman}
          basePayoutToman={campaign.basePayoutToman}
        />
        <div className="flex items-center justify-between gap-3">
          {campaign.deadline ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
              <Clock className="size-3" />
              مهلت تا {formatDate(campaign.deadline)}
            </span>
          ) : (
            <span />
          )}
          {href && (
            <Link href={href} className={cn(brandCta, "px-4 py-2.5 text-sm")}>
              شرکت در کمپین
              <ArrowUpLeft className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

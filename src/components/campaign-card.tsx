import Link from "next/link";
import { ArrowUpLeft, Clock, Flame } from "lucide-react";
import type { Campaign, Platform } from "@/lib/types";
import {
  brandAccentText,
  brandGlassCard,
  brandGlassCardHover,
  brandIconBg,
} from "@/lib/brand";
import { cn, formatDate, formatToman } from "@/lib/utils";
import { InstagramIcon } from "@/components/platform-icons";
import { CampaignBudgetMeter } from "@/components/campaign-budget";
import { CampaignRequirements } from "@/components/campaign-requirements";
import { EarningsCalculator } from "@/components/earnings-calculator";

export function PlatformBadge(_props?: { platform?: Platform }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/15 px-2 py-0.5 text-[11px] text-pink-300">
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
  return (
    <article
      className={cn(
        brandGlassCard,
        brandGlassCardHover,
        "relative overflow-hidden p-5"
      )}
    >
      {campaign.trending && (
        <div className="absolute left-0 top-0 inline-flex items-center gap-1 rounded-bl-2xl bg-brand px-3 py-1 text-[11px] font-bold text-brand-ink">
          <Flame className="size-3" />
          داغ‌ترین کمپین
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PlatformBadge platform={campaign.platform} />
        {campaign.status === "active" ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
            فعال
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50">
            {campaign.status}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            brandIconBg
          )}
        >
          <InstagramIcon className={cn("size-5", brandAccentText)} />
        </div>
        <div>
          <h3 className="font-bold text-white">{campaign.title}</h3>
        </div>
      </div>

      <div className="mb-3">
        <CampaignRequirements campaign={campaign} compact />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-xs text-white/55">
        <span>
          پایه هر ویدیو:{" "}
          <strong className="text-brand">
            {formatToman(campaign.basePayoutToman)} تومان
          </strong>
        </span>
        <span className="text-white/25">|</span>
        <span>سقف: {formatToman(campaign.maxPayoutPerVideoToman)} تومان</span>
      </div>

      <EarningsCalculator
        basePayoutToman={campaign.basePayoutToman}
        viewBonusTiers={campaign.viewBonusTiers}
        maxPayoutPerVideoToman={campaign.maxPayoutPerVideoToman}
      />

      <CampaignBudgetMeter
        spentBudgetToman={campaign.spentBudgetToman}
        totalBudgetToman={campaign.totalBudgetToman}
        basePayoutToman={campaign.basePayoutToman}
      />

      {campaign.deadline && (
        <div className="mt-3 flex items-center justify-end">
          <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
            <Clock className="size-3" />
            {formatDate(campaign.deadline)}
          </span>
        </div>
      )}

      {href && (
        <Link
          href={href}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand/12 px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
        >
          پیوستن و ارسال ویدیو
          <ArrowUpLeft className="size-3.5" />
        </Link>
      )}
    </article>
  );
}

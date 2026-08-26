import Link from "next/link";
import { ArrowUpLeft, Flame } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { brandCta } from "@/lib/brand";
import { cn, formatToman } from "@/lib/utils";
import { CampaignBudgetMeter } from "@/components/campaign-budget";
import { InstagramIcon } from "@/components/platform-icons";
import { SectionBadge } from "@/components/section-badge";

export function TrendingBanner({ campaign }: { campaign: Campaign }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand/20 bg-surface p-6 sm:p-8">
      <div
        className="earn-blob pointer-events-none absolute -left-10 -bottom-16 size-64 rounded-full bg-brand/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <SectionBadge icon={Flame}>پرسودترین کمپین همین حالا</SectionBadge>
          <h2 className="max-w-lg text-lg font-extrabold text-white sm:text-xl">
            {campaign.title}
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-white/55">
            محتوا بساز، فایل‌های راهنما را دانلود کن و ویدیوی خودت را ارسال کن.
            سقف پرداخت هر ویدیو شفاف است؛ قبل از شروع دقیقاً می‌دانی چقدر
            می‌گیری.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
            <span className="inline-flex items-center gap-1">
              <InstagramIcon className="size-3.5" />
              اینستاگرام
            </span>
            <span>·</span>
            <span>
              سقف پرداخت:{" "}
              <strong className="text-brand">
                {formatToman(campaign.maxPayoutPerVideoToman)} تومان
              </strong>
            </span>
          </div>
          {campaign.totalBudgetToman > 0 && (
            <div className="max-w-lg pt-1">
              <CampaignBudgetMeter
                spentBudgetToman={campaign.spentBudgetToman}
                totalBudgetToman={campaign.totalBudgetToman}
                basePayoutToman={campaign.basePayoutToman}
                compact
              />
            </div>
          )}
        </div>
        <Link
          href={`/posts?campaign=${campaign.id}`}
          className={cn(brandCta, "shrink-0 px-5 py-3 text-sm")}
        >
          پیوستن به هایپ
          <ArrowUpLeft className="size-4" />
        </Link>
      </div>
    </div>
  );
}

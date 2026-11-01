"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { brandCta } from "@/lib/brand";
import {
  buildToolUrl,
  toolUrlAcceptsPrompt,
  type PromptPackItem,
} from "@/lib/prompt-pack";
import { cn } from "@/lib/utils";

export type CampaignPromptPackSource = {
  toolUrl?: string | null;
  promptPack?: PromptPackItem[];
};

export function campaignHasPromptPack(campaign: CampaignPromptPackSource) {
  return (
    (campaign.promptPack?.length ?? 0) > 0 ||
    buildToolUrl(campaign.toolUrl) !== null
  );
}

function copyQuietly(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

/**
 * Ready-made prompts for a campaign plus a link into the BananaAI tool. When
 * the campaign link has a `{prompt}` placeholder the prompt travels in the
 * link; otherwise it is copied to the clipboard as the tool opens.
 */
export function CampaignPromptPack({
  campaign,
  compact = false,
  bare = false,
}: {
  campaign: CampaignPromptPackSource;
  compact?: boolean;
  /** Skip the heading and frame when the parent already provides them. */
  bare?: boolean;
}) {
  const prompts = campaign.promptPack ?? [];
  const genericUrl = buildToolUrl(campaign.toolUrl);
  if (prompts.length === 0 && !genericUrl) return null;

  const carriesPrompt = toolUrlAcceptsPrompt(campaign.toolUrl);

  return (
    <div
      className={cn(
        "space-y-3",
        !bare && "rounded-xl border border-brand/20 bg-brand/[0.05] p-3"
      )}
    >
      {!bare && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
            <Sparkles className="size-3.5 text-brand" />
            با بنانا بساز
          </div>
          <p className="text-[11px] leading-relaxed text-white/50">
            پرامپت آماده را بردار و ریلت را در چند دقیقه بساز.
          </p>
        </div>
      )}

      {prompts.length === 0 && genericUrl && (
        <a
          href={genericUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(brandCta, "px-4 py-2.5 text-sm")}
        >
          ساخت با بنانا
          <ExternalLink className="size-4" />
        </a>
      )}

      {prompts.length > 0 && (
        <ul className="space-y-2">
          {prompts.map((item, index) => {
            const href = buildToolUrl(campaign.toolUrl, item.prompt);
            return (
              <li
                key={`${index}-${item.title}`}
                className="space-y-2 rounded-xl border border-white/8 bg-black/25 p-3"
              >
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <p
                  className={cn(
                    "whitespace-pre-wrap text-sm leading-relaxed text-white/65",
                    compact && "line-clamp-3"
                  )}
                  dir="auto"
                >
                  {item.prompt}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton text={item.prompt}>کپی پرامپت</CopyButton>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!carriesPrompt) copyQuietly(item.prompt);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-brand-ink hover:bg-brand-soft"
                    >
                      ساخت با بنانا
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {prompts.length > 0 && genericUrl && !carriesPrompt && (
        <p className="text-[11px] text-white/40">
          با زدن «ساخت با بنانا» پرامپت کپی می‌شود؛ در ابزار فقط پیست کن.
        </p>
      )}
    </div>
  );
}

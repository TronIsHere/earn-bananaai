"use client";

import { useState } from "react";
import { Eye, ExternalLink, Play, X } from "lucide-react";
import type { ShowcaseReelJson } from "@/lib/earn-submissions-types";
import { cn, formatTomanCompact, formatViewsCompact } from "@/lib/utils";

/**
 * Winning reels: real paid reels from this campaign, each led by what it
 * earned. Proof the payout is real, and a look at what a good reel is.
 * The Instagram embed only loads when the creator asks to watch.
 */

function embedUrl(postUrl: string) {
  return `${postUrl.replace(/\/+$/, "")}/embed/`;
}

export function topShowcaseEarning(reels: readonly ShowcaseReelJson[] | undefined) {
  return (reels ?? []).reduce((max, reel) => Math.max(max, reel.earnedToman), 0);
}

function ReelCard({ reel }: { reel: ShowcaseReelJson }) {
  const [playing, setPlaying] = useState(false);

  return (
    <li className="w-60 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/8 bg-black/30">
      {playing ? (
        <div className="relative">
          <iframe
            src={embedUrl(reel.postUrl)}
            title={`ریل ${reel.creatorName}`}
            className="h-[430px] w-full bg-white"
            loading="lazy"
            allow="encrypted-media"
          />
          <button
            type="button"
            onClick={() => setPlaying(false)}
            aria-label="بستن ریل"
            className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group block w-full bg-[radial-gradient(120%_80%_at_50%_0%,rgba(209,254,23,0.16),transparent_70%)] px-4 pb-4 pt-5 text-right"
        >
          <div className="text-[11px] text-white/45">این ریل</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="earn-money text-2xl text-brand">
              {formatTomanCompact(reel.earnedToman)}
            </span>
            <span className="text-xs text-white/55">تومان گرفت</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" />
              {formatViewsCompact(reel.views)} بازدید
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-white/75 transition-colors group-hover:bg-brand group-hover:text-brand-ink">
              <Play className="size-3" />
              دیدن ریل
            </span>
          </div>
        </button>
      )}
      <div className="flex items-center justify-between border-t border-white/6 px-4 py-2 text-[11px] text-white/40">
        <span className="truncate">ساخته {reel.creatorName}</span>
        <a
          href={reel.postUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 hover:text-white"
        >
          اینستاگرام
          <ExternalLink className="size-3" />
        </a>
      </div>
    </li>
  );
}

export function WinningReels({
  reels,
  className,
}: {
  reels: readonly ShowcaseReelJson[] | undefined;
  className?: string;
}) {
  if (!reels || reels.length === 0) return null;
  return (
    <ul
      className={cn(
        "-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]",
        className
      )}
    >
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </ul>
  );
}

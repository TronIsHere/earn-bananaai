"use client";

import { AtSign, Check, Clapperboard, Hash, ListChecks } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { cn, formatToman } from "@/lib/utils";

/**
 * Pre-submit checklist: every campaign requirement as a tick box the creator
 * confirms against their live post. Fixable rejects (missing hashtag, wrong
 * mention) cost a full review cycle and the one resubmit, so we catch them here.
 */

export type RequirementSource = {
  brief?: string | null;
  requiredHashtags?: string[];
  requiredMentions?: string[];
  requirementsChecklist?: string[];
  minVideoLengthSeconds?: number;
};

export interface RequirementItem {
  key: string;
  kind: "hashtag" | "mention" | "length" | "checklist";
  label: string;
  hint?: string;
}

const kindIcon = {
  hashtag: Hash,
  mention: AtSign,
  length: Clapperboard,
  checklist: ListChecks,
} as const;

export function requirementItems(campaign: RequirementSource): RequirementItem[] {
  const items: RequirementItem[] = [];
  for (const raw of campaign.requiredHashtags ?? []) {
    const tag = raw.replace(/^#/, "").trim();
    if (!tag) continue;
    items.push({ key: `h:${tag}`, kind: "hashtag", label: `#${tag}`, hint: "در کپشن هست" });
  }
  for (const raw of campaign.requiredMentions ?? []) {
    const handle = raw.replace(/^@/, "").trim();
    if (!handle) continue;
    items.push({ key: `m:${handle}`, kind: "mention", label: `@${handle}`, hint: "در کپشن منشن شده" });
  }
  if ((campaign.minVideoLengthSeconds ?? 0) > 0) {
    items.push({
      key: "len",
      kind: "length",
      label: `ویدیو حداقل ${formatToman(campaign.minVideoLengthSeconds ?? 0)} ثانیه است`,
    });
  }
  for (const raw of campaign.requirementsChecklist ?? []) {
    const text = raw.trim();
    if (!text) continue;
    items.push({ key: `c:${text}`, kind: "checklist", label: text });
  }
  return items;
}

/** Keys still unticked. Empty when the campaign has no requirements. */
export function missingRequirements(
  campaign: RequirementSource,
  confirmed: readonly string[]
): RequirementItem[] {
  const done = new Set(confirmed);
  return requirementItems(campaign).filter((item) => !done.has(item.key));
}

export function RequirementsConfirm({
  campaign,
  confirmed,
  onChange,
  showMissing = false,
  className,
}: {
  campaign: RequirementSource;
  confirmed: readonly string[];
  onChange: (next: string[]) => void;
  /** Outline the unticked rows (after a submit attempt). */
  showMissing?: boolean;
  className?: string;
}) {
  const items = requirementItems(campaign);
  const brief = campaign.brief?.trim() ?? "";
  if (items.length === 0 && !brief) return null;

  const done = new Set(confirmed);
  const doneCount = items.filter((item) => done.has(item.key)).length;
  const allDone = doneCount === items.length;
  const hashtags = items.filter((item) => item.kind === "hashtag");
  const mentions = items.filter((item) => item.kind === "mention");
  const captionSnippet = [...hashtags, ...mentions].map((item) => item.label).join(" ");

  const toggle = (key: string) => {
    onChange(done.has(key) ? confirmed.filter((k) => k !== key) : [...confirmed, key]);
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border p-4 transition-colors",
        allDone ? "border-cash/30 bg-cash/[0.05]" : "border-white/10 bg-black/20",
        className
      )}
    >
      {brief ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">{brief}</p>
      ) : null}

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/55">
              پستت را باز کن و هر مورد را که در پست هست تیک بزن.
            </p>
            <span
              className={cn(
                "earn-money rounded-full px-2 py-0.5 text-[11px]",
                allDone ? "bg-cash/15 text-cash" : "bg-white/8 text-white/60"
              )}
            >
              {formatToman(doneCount)} از {formatToman(items.length)}
            </span>
          </div>

          <ul className="space-y-1.5">
            {items.map((item) => {
              const checked = done.has(item.key);
              const Icon = kindIcon[item.kind];
              return (
                <li key={item.key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      checked
                        ? "border-cash/25 bg-cash/[0.07]"
                        : showMissing
                          ? "border-orange-500/40 bg-orange-500/[0.06]"
                          : "border-white/8 bg-black/20 hover:border-white/15"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.key)}
                      aria-label={item.hint ? `${item.label} ${item.hint}` : item.label}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60",
                        checked
                          ? "border-cash bg-cash text-brand-ink"
                          : "border-white/25 bg-black/30 text-transparent"
                      )}
                      aria-hidden
                    >
                      <Check className="size-3.5" />
                    </span>
                    <Icon className="size-3.5 shrink-0 text-white/35" aria-hidden />
                    <span className="min-w-0 flex-1 text-sm text-white/85">
                      <span
                        dir={item.kind === "hashtag" || item.kind === "mention" ? "ltr" : undefined}
                        className={cn(
                          (item.kind === "hashtag" || item.kind === "mention") &&
                            "inline-block font-semibold"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="mr-1.5 text-xs text-white/40">{item.hint}</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {captionSnippet && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
              هنوز کپشن را ننوشتی؟
              <CopyButton text={captionSnippet}>کپی هشتگ و منشن‌ها</CopyButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

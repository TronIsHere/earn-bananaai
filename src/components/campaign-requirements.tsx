import { AtSign, Hash, ListChecks, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignRequirementSource = {
  brief?: string | null;
  requiredHashtags?: string[];
  requiredMentions?: string[];
  requirementsChecklist?: string[];
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

export function campaignHasRequirements(campaign: CampaignRequirementSource) {
  return (
    hasText(campaign.brief) ||
    (campaign.requiredHashtags?.length ?? 0) > 0 ||
    (campaign.requiredMentions?.length ?? 0) > 0 ||
    (campaign.requirementsChecklist?.length ?? 0) > 0
  );
}

function RequiredBadge() {
  return (
    <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
      الزامی
    </span>
  );
}

function RequirementHeading({
  icon: Icon,
  label,
}: {
  icon: typeof Hash;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
      <Icon className="size-3.5 text-brand" />
      {label}
      <RequiredBadge />
    </div>
  );
}

export function CampaignRequirements({
  campaign,
  compact = false,
}: {
  campaign: CampaignRequirementSource;
  compact?: boolean;
}) {
  const brief = campaign.brief?.trim() ?? "";
  const hashtags = campaign.requiredHashtags ?? [];
  const mentions = campaign.requiredMentions ?? [];
  const checklist = campaign.requirementsChecklist ?? [];

  if (
    !brief &&
    hashtags.length === 0 &&
    mentions.length === 0 &&
    checklist.length === 0
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-rose-500/15 bg-rose-950/10 p-3",
        compact && "space-y-2.5 p-2.5"
      )}
    >
      <p className="text-[11px] leading-relaxed text-white/50">
        هر موردی که در کمپین آمده باید در پست باشد؛ وگرنه ارسال اصلاح می‌خواهد
        یا رد می‌شود.
      </p>

      {brief ? (
        <section className="space-y-1.5">
          <RequirementHeading icon={ScrollText} label="توضیحات" />
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed text-white/70",
              compact && "line-clamp-6"
            )}
          >
            {brief}
          </p>
        </section>
      ) : null}

      {hashtags.length > 0 ? (
        <section className="space-y-1.5">
          <RequirementHeading icon={Hash} label="هشتگ" />
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag) => (
              <span
                key={`h-${tag}`}
                className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/75"
              >
                #{tag.replace(/^#/, "")}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {mentions.length > 0 ? (
        <section className="space-y-1.5">
          <RequirementHeading icon={AtSign} label="آیدی" />
          <div className="flex flex-wrap gap-1.5">
            {mentions.map((mention) => (
              <span
                key={`m-${mention}`}
                className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/75"
              >
                @{mention.replace(/^@/, "")}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {checklist.length > 0 ? (
        <section className="space-y-1.5">
          <RequirementHeading icon={ListChecks} label="چک‌لیست" />
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm leading-relaxed text-white/70"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { BellRing, Check, Loader2, MessageSquareText } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { brandCta } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * "Text me when a new campaign opens" for admin-marked creators. Renders
 * nothing for everyone else, so empty states stay unchanged for them.
 */
export function CampaignAlertOptIn({ className }: { className?: string }) {
  const { state, updateProfile } = useStore();
  const { campaignSmsEligible, campaignSmsOptIn, mobileNumber } = state.profile;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!campaignSmsEligible) return null;

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/earn/campaign-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        campaignSmsOptIn?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "ثبت درخواست ناموفق بود");
        return;
      }
      updateProfile({ campaignSmsOptIn: Boolean(data.campaignSmsOptIn) });
    } catch {
      setError("ثبت درخواست ناموفق بود");
    } finally {
      setBusy(false);
    }
  };

  if (campaignSmsOptIn) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-brand/25 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand">
          <Check className="size-4" />
          خبرت می‌کنیم
        </div>
        <p className="text-xs text-white/45">
          با باز شدن کمپین بعدی یک پیامک به{" "}
          <span dir="ltr">{mobileNumber}</span> می‌فرستیم.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle(false)}
          className="text-xs text-white/35 underline-offset-4 hover:text-white/60 hover:underline disabled:opacity-50"
        >
          لغو درخواست
        </button>
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle(true)}
        className={cn(brandCta, "px-5 py-2.5 text-sm")}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BellRing className="size-4" />
        )}
        وقتی کمپین جدید باز شد، پیامک بده
      </button>
      <p className="inline-flex items-center gap-1 text-[11px] text-white/40">
        <MessageSquareText className="size-3.5" />
        فقط یک پیامک، همان لحظه که کمپین بعدی باز شود.
      </p>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}

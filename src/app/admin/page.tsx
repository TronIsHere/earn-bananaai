"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Eye,
  Inbox,
  Loader2,
  Shield,
} from "lucide-react";
import { AdminAnalyticsPanel } from "@/components/admin-analytics-panel";
import { AdminCampaignsPanel } from "@/components/admin-campaigns-panel";
import { AdminDay7Panel } from "@/components/admin-day7-panel";
import { AdminPayoutsPanel } from "@/components/admin-payouts-panel";
import { AdminSubmissionsPanel } from "@/components/admin-submissions-panel";
import { AdminVerificationsPanel } from "@/components/admin-verifications-panel";
import { useStore } from "@/components/store-provider";
import { brandHeadlineGradient } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AdminTab =
  | "campaigns"
  | "verifications"
  | "review"
  | "day7"
  | "payouts"
  | "analytics";

export default function AdminPage() {
  const { ready, isAdmin } = useStore();
  const [tab, setTab] = useState<AdminTab>("campaigns");

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-white/60">این صفحه فقط برای مدیران است.</p>
        <Link href="/" className="text-sm text-brand underline underline-offset-4">
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/8 bg-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand/12 text-brand">
              <Shield className="size-4" />
            </div>
            <div>
              <h1 className={cn("text-lg font-bold", brandHeadlineGradient)}>
                پنل مدیریت کمپین
              </h1>
              <p className="text-xs text-white/45">
                کمپین، تأیید اینستاگرام، بررسی ارسال، واریز دستی و پاداش روز ۷.
                SLA بررسی: حداکثر ۴۸ ساعت.
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
          >
            بازگشت به داشبورد
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-black/20 p-1">
          <TabButton
            active={tab === "campaigns"}
            onClick={() => setTab("campaigns")}
            icon={Shield}
          >
            کمپین‌ها
          </TabButton>
          <TabButton
            active={tab === "verifications"}
            onClick={() => setTab("verifications")}
            icon={BadgeCheck}
          >
            تأیید اینستاگرام
          </TabButton>
          <TabButton
            active={tab === "review"}
            onClick={() => setTab("review")}
            icon={Inbox}
          >
            بررسی ارسال
          </TabButton>
          <TabButton
            active={tab === "day7"}
            onClick={() => setTab("day7")}
            icon={Eye}
          >
            بازدید روز ۷
          </TabButton>
          <TabButton
            active={tab === "payouts"}
            onClick={() => setTab("payouts")}
            icon={Banknote}
          >
            واریز دستی
          </TabButton>
          <TabButton
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
            icon={BarChart3}
          >
            آمار بازدید
          </TabButton>
        </div>

        {tab === "campaigns" && <AdminCampaignsPanel />}
        {tab === "verifications" && <AdminVerificationsPanel />}
        {tab === "review" && <AdminSubmissionsPanel />}
        {tab === "day7" && <AdminDay7Panel />}
        {tab === "payouts" && <AdminPayoutsPanel />}
        {tab === "analytics" && <AdminAnalyticsPanel />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Shield;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-brand/15 text-brand"
          : "text-white/55 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}

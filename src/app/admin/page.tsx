"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { AdminAnalyticsPanel } from "@/components/admin-analytics-panel";
import { AdminCampaignsPanel } from "@/components/admin-campaigns-panel";
import { AdminDay7Panel } from "@/components/admin-day7-panel";
import { AdminLedgerAuditCard } from "@/components/admin-ledger-audit-card";
import { AdminOverviewPanel } from "@/components/admin-overview-panel";
import { AdminPayoutsPanel } from "@/components/admin-payouts-panel";
import {
  AdminShell,
  isAdminTab,
  type AdminTab,
} from "@/components/admin-shell";
import { AdminSubmissionsPanel } from "@/components/admin-submissions-panel";
import { AdminVerificationsPanel } from "@/components/admin-verifications-panel";
import { AdminWinningReelsPanel } from "@/components/admin-winning-reels-panel";
import { useStore } from "@/components/store-provider";

export default function AdminPage() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <AdminPageInner />
    </Suspense>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-brand" />
    </div>
  );
}

function AdminPageInner() {
  const { ready, isAdmin } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const tab: AdminTab = isAdminTab(param) ? param : "overview";

  const setTab = useCallback(
    (next: AdminTab, extra?: Record<string, string>) => {
      const params = new URLSearchParams({ tab: next, ...extra });
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router]
  );

  if (!ready) return <FullScreenSpinner />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5 text-white/40">
          <ShieldOff className="size-6" />
        </div>
        <p className="text-sm text-white/60">این صفحه فقط برای مدیران است.</p>
        <Link href="/" className="text-sm text-brand underline underline-offset-4">
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  return (
    <AdminShell tab={tab} onTabChange={setTab}>
      {/* key remounts the panel so each visit loads fresh queue data. */}
      <div key={tab}>
        {tab === "overview" && <AdminOverviewPanel />}
        {tab === "verifications" && <AdminVerificationsPanel />}
        {tab === "review" && <AdminSubmissionsPanel />}
        {tab === "day7" && <AdminDay7Panel />}
        {tab === "payouts" && <AdminPayoutsPanel />}
        {tab === "campaigns" && <AdminCampaignsPanel />}
        {tab === "winners" && <AdminWinningReelsPanel />}
        {tab === "analytics" && <AdminAnalyticsPanel />}
        {tab === "ledger" && <AdminLedgerAuditCard />}
      </div>
    </AdminShell>
  );
}

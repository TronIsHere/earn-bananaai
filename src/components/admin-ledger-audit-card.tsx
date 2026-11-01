"use client";

import { useState } from "react";
import { CircleCheck, ScanSearch, Wrench } from "lucide-react";
import {
  AdminEmpty,
  AdminError,
  AdminNotice,
  AdminPageHeader,
  AdminSpinnerIcon,
  adminBtn,
  adminCard,
} from "@/components/admin-ui";
import type { WalletReconcileRowJson } from "@/lib/earn-ledger-types";
import { cn, formatToman } from "@/lib/utils";

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${formatToman(value)}`;
}

/**
 * Compares every creator wallet with the sum of its ledger rows. Wallets that
 * predate the ledger show up here once; recording an adjustment gives them an
 * opening balance so their statement adds up.
 */
export function AdminLedgerAuditCard() {
  const [rows, setRows] = useState<WalletReconcileRowJson[] | null>(null);
  const [busy, setBusy] = useState<"check" | "fix" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixedCount, setFixedCount] = useState<number | null>(null);

  const call = async (method: "GET" | "POST") => {
    setBusy(method === "GET" ? "check" : "fix");
    setError(null);
    try {
      const res = await fetch("/api/admin/earn/ledger/reconcile", { method });
      const data = (await res.json()) as {
        rows?: WalletReconcileRowJson[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بررسی دفتر حساب ناموفق بود");
        return null;
      }
      return data.rows ?? [];
    } catch {
      setError("بررسی دفتر حساب ناموفق بود");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    const result = await call("GET");
    if (result) {
      setRows(result);
      setFixedCount(null);
    }
  };

  const fix = async () => {
    const result = await call("POST");
    if (result) {
      setFixedCount(result.filter((row) => row.fixed).length);
      setRows([]);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={ScanSearch}
        title="تطبیق دفتر حساب"
        description="مجموع ردیف‌های دفتر هر کاربر باید با موجودی کیف پولش برابر باشد."
        actions={
          <button
            type="button"
            onClick={() => void check()}
            disabled={busy !== null}
            className={adminBtn.primary}
          >
            <AdminSpinnerIcon busy={busy === "check"} icon={ScanSearch} />
            {rows ? "بررسی دوباره" : "شروع بررسی"}
          </button>
        }
        guide="کیف پول‌های قبل از فعال شدن دفتر یک بار اختلاف نشان می‌دهند. ثبت تعدیل، کیف پول فعلی را درست فرض می‌کند و برای هر اختلاف یک ردیف «تعدیل حساب» می‌نویسد."
      />

      {error && <AdminError message={error} />}
      {fixedCount != null && (
        <AdminNotice>
          {formatToman(fixedCount)} تعدیل ثبت شد و دفتر حساب با کیف پول‌ها یکی شد.
        </AdminNotice>
      )}

      {rows == null && fixedCount == null && !error && (
        <AdminEmpty
          icon={ScanSearch}
          title="هنوز بررسی نشده"
          hint="«شروع بررسی» همه کیف پول‌ها را با دفتر حساب مقایسه می‌کند. چیزی تغییر نمی‌کند."
        />
      )}

      {rows && rows.length === 0 && fixedCount == null && (
        <AdminEmpty
          icon={CircleCheck}
          title="همه کیف پول‌ها با دفتر حساب یکی است"
        />
      )}

      {rows && rows.length > 0 && (
        <section className={cn(adminCard, "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/6 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">
              {formatToman(rows.length)} کیف پول با اختلاف
            </h2>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-white/6 px-4 py-2 text-[11px] text-white/35">
            <span>سازنده</span>
            <span>موجودی</span>
            <span>درآمد</span>
            <span>واریز</span>
          </div>
          <ul className="divide-y divide-white/6">
            {rows.map((row) => (
              <li
                key={row.userId}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-2.5 text-xs"
              >
                <span className="min-w-0 truncate text-white/80">
                  {row.name || "کاربر"}
                  <span className="mr-2 text-white/35" dir="ltr">
                    {row.mobileNumber}
                  </span>
                </span>
                <Drift value={row.drift.balance} />
                <Drift value={row.drift.lifetimeEarned} />
                <Drift value={row.drift.lifetimePaidOut} />
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-white/6 bg-black/20 px-4 py-3">
            <p className="text-xs text-white/45">
              بهتر است وقتی پولی در حال جابه‌جایی نیست انجام شود.
            </p>
            <button
              type="button"
              onClick={() => void fix()}
              disabled={busy !== null}
              className={adminBtn.warn}
            >
              <AdminSpinnerIcon busy={busy === "fix"} icon={Wrench} />
              ثبت تعدیل برای {formatToman(rows.length)} کیف پول
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Drift({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value === 0 ? "text-white/30" : value > 0 ? "text-cash" : "text-rose-300"
      )}
      dir="ltr"
    >
      {signed(value)}
    </span>
  );
}

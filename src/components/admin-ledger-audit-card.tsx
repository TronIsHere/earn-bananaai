"use client";

import { useState } from "react";
import { Loader2, ScanSearch } from "lucide-react";
import { brandGlassCard } from "@/lib/brand";
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
    <section className={cn(brandGlassCard, "space-y-3 p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <ScanSearch className="size-4 text-brand" />
            تطبیق کیف پول‌ها با دفتر حساب
          </h3>
          <p className="mt-1 text-xs text-white/45">
            مجموع ردیف‌های دفتر هر کاربر باید با موجودی کیف پولش برابر باشد.
            کیف پول‌های قبل از فعال شدن دفتر یک بار اختلاف نشان می‌دهند.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          {busy === "check" && <Loader2 className="size-3.5 animate-spin" />}
          بررسی
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {fixedCount != null && (
        <p className="text-sm text-cash">
          {formatToman(fixedCount)} تعدیل ثبت شد و دفتر حساب با کیف پول‌ها یکی شد.
        </p>
      )}

      {rows && rows.length === 0 && fixedCount == null && (
        <p className="text-sm text-cash">
          همه کیف پول‌ها با دفتر حساب یکی است.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-2">
          <ul className="divide-y divide-white/6 rounded-xl border border-white/8">
            {rows.map((row) => (
              <li
                key={row.userId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <span className="text-white/80">
                  {row.name || "کاربر"}
                  <span className="mr-2 text-white/35" dir="ltr">
                    {row.mobileNumber}
                  </span>
                </span>
                <span className="text-white/55">
                  موجودی {signed(row.drift.balance)} · درآمد{" "}
                  {signed(row.drift.lifetimeEarned)} · واریز{" "}
                  {signed(row.drift.lifetimePaidOut)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/45">
            ثبت تعدیل، کیف پول فعلی را درست فرض می‌کند و برای هر اختلاف یک ردیف
            «تعدیل حساب» می‌نویسد. بهتر است وقتی پولی در حال جابه‌جایی نیست انجام
            شود.
          </p>
          <button
            type="button"
            onClick={() => void fix()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
          >
            {busy === "fix" && <Loader2 className="size-4 animate-spin" />}
            ثبت تعدیل برای {formatToman(rows.length)} کیف پول
          </button>
        </div>
      )}
    </section>
  );
}

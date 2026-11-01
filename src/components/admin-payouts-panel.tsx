"use client";

import { useCallback, useEffect, useState } from "react";
import { TriangleAlert, Banknote, Check, Download, X } from "lucide-react";
import { useAdminRefresh } from "@/components/admin-shell";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPerson,
  AdminPill,
  AdminRefreshButton,
  AdminSegmented,
  AdminSpinnerIcon,
  adminBtn,
  adminCard,
  adminField,
  type PillTone,
} from "@/components/admin-ui";
import { CopyButton } from "@/components/copy-button";
import { Money } from "@/components/money";
import { ReviewSlaBadge, reviewSlaCardClass } from "@/components/review-sla";
import { formFocus } from "@/lib/brand";
import type { EarnPayoutStatus } from "@/lib/earn";
import { formatSheba } from "@/lib/sheba";
import { cn, formatDate } from "@/lib/utils";

interface AdminPayoutRow {
  id: string;
  amount: number;
  bankNote: string;
  bankSheba: string | null;
  bankAccountHolder: string | null;
  bankName: string | null;
  status: EarnPayoutStatus;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
  } | null;
}

/** Names compare equal ignoring spacing, ZWNJ and Arabic/Persian letter variants. */
function nameKey(value: string) {
  return value
    .replace(/[\u200c\s]+/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLowerCase();
}

const statusMeta: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: "در انتظار", tone: "warn" },
  paid: { label: "واریز شد", tone: "cash" },
  rejected: { label: "رد شده", tone: "danger" },
};

export function AdminPayoutsPanel() {
  const [status, setStatus] = useState<"pending" | "paid" | "rejected" | "all">(
    "pending"
  );
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const refreshOverview = useAdminRefresh();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/payouts?status=${status}`);
      const data = (await res.json()) as {
        payouts?: AdminPayoutRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری درخواست‌های واریز ناموفق بود");
        setRows([]);
        return;
      }
      setRows(data.payouts ?? []);
    } catch {
      setError("بارگذاری درخواست‌های واریز ناموفق بود");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decide = async (id: string, decision: "pay" | "reject") => {
    const note = (notes[id] || "").trim();
    if (decision === "reject" && note.length < 3) {
      setError("برای رد کردن، دلیل را بنویس.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          ...(note ? { note } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "ثبت تصمیم ناموفق بود");
        return;
      }
      refreshOverview();
      await load();
    } catch {
      setError("ثبت تصمیم ناموفق بود");
    } finally {
      setBusyId(null);
    }
  };

  const pendingTotal = rows
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Banknote}
        title="واریز دستی"
        description="به شبای سازنده کارت‌به‌کارت یا پایا بزن، بعد اینجا ثبت کن."
        actions={
          <>
            <a
              href={`/api/admin/earn/payouts/export?status=${status}`}
              download
              className={adminBtn.ghost}
            >
              <Download className="size-4" />
              خروجی CSV
            </a>
            <AdminRefreshButton onClick={() => void load()} loading={loading} />
          </>
        }
        guide={
          <>
            SLA بررسی حداکثر ۴۸ ساعت است. واریز بانکی در خود سایت انجام نمی‌شود؛
            اول مبلغ را از بانک بزن و بعد «واریز شد» را ثبت کن. اگر نام صاحب
            حساب با نام ثبت‌نام فرق دارد، قبل از واریز با سازنده هماهنگ کن.
            قدیمی‌ترین درخواست‌ها بالاترند.
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSegmented
          value={status}
          onChange={setStatus}
          options={[
            {
              id: "pending",
              label: "در انتظار",
              count: status === "pending" && !loading ? rows.length : undefined,
            },
            { id: "paid", label: "واریز شده" },
            { id: "rejected", label: "رد شده" },
            { id: "all", label: "همه" },
          ]}
        />
        {status === "pending" && pendingTotal > 0 && !loading && (
          <div className="text-left text-xs text-white/45">
            جمع در انتظار{" "}
            <Money amount={pendingTotal} size="sm" animate={false} />
          </div>
        )}
      </div>

      {error && !loading && rows.length > 0 && <AdminError message={error} />}

      {loading ? (
        <AdminLoading />
      ) : error && rows.length === 0 ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <AdminEmpty
          icon={Banknote}
          title={
            status === "pending"
              ? "درخواست واریزی در صف نیست"
              : "موردی در این وضعیت نیست"
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const meta = statusMeta[row.status] ?? {
              label: row.status,
              tone: "neutral" as const,
            };
            const busy = busyId === row.id;
            const nameMismatch =
              row.user &&
              row.bankAccountHolder &&
              nameKey(row.bankAccountHolder) !==
                nameKey(`${row.user.firstName}${row.user.lastName}`);
            return (
              <article
                key={row.id}
                className={cn(
                  adminCard,
                  "overflow-hidden",
                  row.status === "pending" ? reviewSlaCardClass(row.createdAt) : ""
                )}
              >
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <AdminPerson
                      firstName={row.user?.firstName}
                      lastName={row.user?.lastName}
                      badge={<AdminPill tone={meta.tone}>{meta.label}</AdminPill>}
                      meta={
                        <>
                          <span dir="ltr">{row.user?.mobileNumber ?? ""}</span>
                          {" · "}
                          {formatDate(row.createdAt)}
                        </>
                      }
                    />
                    <div className="flex flex-col items-end gap-1.5">
                      <Money
                        amount={row.amount}
                        size="md"
                        animate={false}
                        valueClassName={
                          row.status === "paid" ? "text-cash" : "text-white"
                        }
                      />
                      {row.status === "pending" && (
                        <ReviewSlaBadge startedAt={row.createdAt} />
                      )}
                    </div>
                  </div>

                  {row.bankSheba ? (
                    <div className="divide-y divide-white/6 rounded-xl border border-white/8 bg-black/25">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[11px] text-white/40">
                            شبا{row.bankName ? ` · ${row.bankName}` : ""}
                          </div>
                          <p
                            className="mt-0.5 text-sm font-semibold tracking-wide text-white"
                            dir="ltr"
                          >
                            {formatSheba(row.bankSheba)}
                          </p>
                        </div>
                        <CopyButton text={row.bankSheba} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[11px] text-white/40">صاحب حساب</div>
                          <p className="mt-0.5 text-sm text-white/85">
                            {row.bankAccountHolder || "-"}
                          </p>
                        </div>
                        {row.bankAccountHolder && (
                          <CopyButton text={row.bankAccountHolder} />
                        )}
                      </div>
                      {nameMismatch && row.user && (
                        <p className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-amber-200">
                          <TriangleAlert className="size-3.5 shrink-0" />
                          نام صاحب حساب با نام ثبت‌نام ({row.user.firstName}{" "}
                          {row.user.lastName}) فرق دارد.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-2.5">
                      <div className="text-[11px] text-white/40">
                        حساب (درخواست قدیمی، متن آزاد)
                      </div>
                      <p
                        className="mt-1 whitespace-pre-wrap text-sm text-white"
                        dir="ltr"
                      >
                        {row.bankNote || "-"}
                      </p>
                    </div>
                  )}

                  {row.adminNote && row.status !== "pending" && (
                    <p className="text-sm text-white/55">یادداشت: {row.adminNote}</p>
                  )}
                </div>

                {row.status === "pending" && (
                  <div className="space-y-2 border-t border-white/6 bg-black/20 px-4 py-3 sm:px-5">
                    <textarea
                      value={notes[row.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="یادداشت ادمین، مثلاً شماره پیگیری (برای رد کردن الزامی است)"
                      aria-label="یادداشت ادمین"
                      className={cn(adminField, formFocus, "min-h-14")}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(row.id, "pay")}
                        className={adminBtn.primary}
                      >
                        <AdminSpinnerIcon busy={busy} icon={Check} />
                        واریز شد
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(row.id, "reject")}
                        className={adminBtn.danger}
                      >
                        <X className="size-4" />
                        رد
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

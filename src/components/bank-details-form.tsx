"use client";

import { useState } from "react";
import { Check, Landmark, Loader2 } from "lucide-react";
import { useStore } from "@/components/store-provider";
import { brandCta, formFocus, formInput } from "@/lib/brand";
import {
  formatSheba,
  formatShebaInput,
  isValidSheba,
  shebaBankName,
} from "@/lib/sheba";
import { accountHolderSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

/** Read-only view of the saved account, with an edit button. */
export function BankDetailsSummary({
  onEdit,
  className,
}: {
  onEdit?: () => void;
  className?: string;
}) {
  const { state } = useStore();
  const { bankSheba, bankAccountHolder } = state.profile;
  if (!bankSheba) return null;
  const bank = shebaBankName(bankSheba);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-4",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cash/12 text-cash">
          <Landmark className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">
            {bankAccountHolder}
            {bank ? (
              <span className="mr-2 text-xs font-normal text-white/45">{bank}</span>
            ) : null}
          </div>
          <div
            className="mt-0.5 break-all text-xs tracking-wide text-white/55"
            dir="ltr"
          >
            {formatSheba(bankSheba)}
          </div>
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/65 transition-colors hover:bg-white/5 hover:text-white"
        >
          ویرایش
        </button>
      )}
    </div>
  );
}

/**
 * SHEBA + account holder, saved on the profile and reused for every payout.
 * Validates the checksum locally so typos are caught before the server call.
 */
export function BankDetailsForm({
  onSaved,
  onCancel,
  className,
}: {
  onSaved?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const { state, updateProfile } = useStore();
  const profile = state.profile;
  const [sheba, setSheba] = useState(
    profile.bankSheba ? formatSheba(profile.bankSheba) : ""
  );
  const [holder, setHolder] = useState(
    profile.bankAccountHolder ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ")
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shebaOk = isValidSheba(sheba);
  const shebaError =
    touched && sheba.trim() !== "" && !shebaOk
      ? "شماره شبا نامعتبر است. با IR شروع می‌شود و ۲۴ رقم دارد."
      : null;
  const bank = shebaOk ? shebaBankName(sheba) : null;

  const save = async () => {
    setTouched(true);
    setError(null);
    if (!shebaOk) {
      setError("شماره شبا را کامل و درست وارد کن.");
      return;
    }
    const holderCheck = accountHolderSchema.safeParse(holder);
    if (!holderCheck.success || !holderCheck.data) {
      setError(
        holderCheck.success
          ? "نام صاحب حساب را بنویس."
          : holderCheck.error.issues[0]?.message || "نام صاحب حساب نامعتبر است"
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankSheba: sheba,
          bankAccountHolder: holderCheck.data,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        bankSheba?: string | null;
        bankAccountHolder?: string | null;
      };
      if (!res.ok) {
        setError(data.error || "ذخیره حساب بانکی ناموفق بود");
        return;
      }
      updateProfile({
        bankSheba: data.bankSheba ?? null,
        bankAccountHolder: data.bankAccountHolder ?? null,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
      onSaved?.();
    } catch {
      setError("ذخیره حساب بانکی ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-white/55">شماره شبا</span>
        <input
          value={sheba}
          onChange={(e) => setSheba(formatShebaInput(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder="IR00 0000 0000 0000 0000 0000 00"
          inputMode="text"
          autoComplete="off"
          dir="ltr"
          aria-invalid={Boolean(shebaError)}
          className={cn(
            formInput,
            formFocus,
            "h-12 text-left tracking-wide",
            shebaError && "border-rose-500/50"
          )}
        />
        {shebaError ? (
          <span className="block text-[11px] text-rose-300">{shebaError}</span>
        ) : shebaOk ? (
          <span className="block text-[11px] text-cash">
            شبا معتبر است{bank ? ` · ${bank}` : ""}
          </span>
        ) : (
          <span className="block text-[11px] text-white/35">
            شبا ۲۶ کاراکتر است و با IR شروع می‌شود. اگر IR را ننویسی خودمان اضافه
            می‌کنیم.
          </span>
        )}
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-white/55">نام صاحب حساب</span>
        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          autoComplete="off"
          className={cn(formInput, formFocus, "h-12")}
        />
        <span className="block text-[11px] text-white/35">
          دقیقاً مطابق نامی که بانک برای این شبا نشان می‌دهد.
        </span>
      </label>

      {error && (
        <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={cn(brandCta, "h-11 px-5 text-sm")}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? "ذخیره شد" : "ذخیره حساب بانکی"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-11 rounded-2xl border border-white/10 px-4 text-sm text-white/60 transition-colors hover:bg-white/5"
          >
            انصراف
          </button>
        )}
      </div>
    </div>
  );
}

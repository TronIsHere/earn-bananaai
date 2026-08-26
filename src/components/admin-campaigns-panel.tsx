"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { PlatformBadge } from "@/components/campaign-card";
import { SectionBadge } from "@/components/section-badge";
import { brandCta, brandCtaGhost, brandGlassCard, formFocus } from "@/lib/brand";
import {
  DEFAULT_BASE_PAYOUT_TOMAN,
  DEFAULT_CAMPAIGN_BUDGET_TOMAN,
  DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
  DEFAULT_VIEW_BONUS_TIERS,
  remainingBudgetToman,
} from "@/lib/earn";
import type { Campaign, CampaignStatus } from "@/lib/types";
import {
  cn,
  formatDate,
  formatGroupedInput,
  formatToman,
  parseGroupedNumber,
} from "@/lib/utils";

const defaultTierRows = DEFAULT_VIEW_BONUS_TIERS.map((tier) => ({
  views: formatToman(tier.minViews),
  bonus: formatToman(tier.bonusToman),
}));

const emptyForm = {
  title: "",
  brief: "",
  requirementsChecklist: "",
  requiredHashtags: "",
  requiredMentions: "",
  basePayoutToman: formatToman(DEFAULT_BASE_PAYOUT_TOMAN),
  maxPayoutPerVideoToman: formatToman(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN),
  maxSubmissionsPerUser: formatToman(3),
  totalBudgetToman: formatToman(DEFAULT_CAMPAIGN_BUDGET_TOMAN),
  tiers: defaultTierRows,
  deadline: "",
  status: "active" as CampaignStatus,
  trending: false,
};

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function campaignToForm(campaign: Campaign): typeof emptyForm {
  const sortedTiers = [...campaign.viewBonusTiers].sort(
    (a, b) => a.minViews - b.minViews
  );
  return {
    title: campaign.title,
    brief: campaign.brief,
    requirementsChecklist: campaign.requirementsChecklist.join("\n"),
    requiredHashtags: campaign.requiredHashtags.join(", "),
    requiredMentions: campaign.requiredMentions.join(", "),
    basePayoutToman: formatToman(campaign.basePayoutToman),
    maxPayoutPerVideoToman: formatToman(campaign.maxPayoutPerVideoToman),
    maxSubmissionsPerUser: formatToman(campaign.maxSubmissionsPerUser),
    totalBudgetToman: formatToman(campaign.totalBudgetToman),
    tiers: defaultTierRows.map((row, index) => ({
      views: sortedTiers[index]
        ? formatToman(sortedTiers[index].minViews)
        : "",
      bonus: sortedTiers[index]
        ? formatToman(sortedTiers[index].bonusToman)
        : "",
    })),
    deadline: toDatetimeLocalValue(campaign.deadline),
    status: campaign.status,
    trending: Boolean(campaign.trending),
  };
}

function formToPayload(form: typeof emptyForm) {
  const maxPayoutPerVideoToman =
    parseGroupedNumber(form.maxPayoutPerVideoToman) || 0;
  const tiers = form.tiers
    .map((row) => ({
      minViews: parseGroupedNumber(row.views),
      bonusToman: parseGroupedNumber(row.bonus),
    }))
    .filter(
      (tier) =>
        Number.isFinite(tier.minViews) &&
        tier.minViews > 0 &&
        Number.isFinite(tier.bonusToman) &&
        tier.bonusToman > 0
    )
    .sort((a, b) => a.minViews - b.minViews);

  return {
    title: form.title.trim(),
    brief: form.brief.trim(),
    platform: "instagram" as const,
    requirementsChecklist: form.requirementsChecklist
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    requiredHashtags: form.requiredHashtags
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean),
    requiredMentions: form.requiredMentions
      .split(/[\n,]+/)
      .map((s) => s.trim().replace(/^@/, ""))
      .filter(Boolean),
    basePayoutToman: parseGroupedNumber(form.basePayoutToman) || 0,
    viewBonusTiers: tiers,
    maxPayoutPerVideoToman,
    maxSubmissionsPerUser: parseGroupedNumber(form.maxSubmissionsPerUser) || 3,
    totalBudgetToman: parseGroupedNumber(form.totalBudgetToman) || 0,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    status: form.status,
    trending: form.trending,
  };
}

function parsedTierPayouts(form: typeof emptyForm) {
  const base = parseGroupedNumber(form.basePayoutToman) || 0;
  const cap = parseGroupedNumber(form.maxPayoutPerVideoToman) || 0;
  let runningBonus = 0;
  const rows = form.tiers.map((row) => {
    const bonus = parseGroupedNumber(row.bonus);
    const views = parseGroupedNumber(row.views);
    const hasBonus = Number.isFinite(bonus) && bonus > 0;
    if (hasBonus) runningBonus += bonus;
    return {
      hasBonus,
      views: Number.isFinite(views) && views > 0 ? views : 0,
      bonus: hasBonus ? bonus : 0,
      bonusSum: hasBonus ? runningBonus : null,
      total: hasBonus ? base + runningBonus : null,
    };
  });
  return {
    base,
    cap,
    rows,
    bonusSum: runningBonus,
    total: runningBonus > 0 || base > 0 ? base + runningBonus : null,
  };
}

function capRelationLabel(total: number, cap: number) {
  const delta = total - cap;
  if (delta === 0) return { tone: "equal" as const, delta: 0 };
  if (delta < 0) return { tone: "under" as const, delta: -delta };
  return { tone: "over" as const, delta };
}

export function AdminCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const payouts = parsedTierPayouts(form);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    if (showForm && !editingId) {
      closeForm();
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (campaign: Campaign) => {
    if (editingId === campaign.id && showForm) {
      closeForm();
      return;
    }
    setEditingId(campaign.id);
    setForm(campaignToForm(campaign));
    setShowForm(true);
    setError(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/earn/campaigns");
      const data = (await response.json()) as {
        campaigns?: Campaign[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error || "بارگذاری کمپین‌ها ناموفق بود");
        setCampaigns([]);
        return;
      }
      setCampaigns(data.campaigns ?? []);
    } catch {
      setError("بارگذاری کمپین‌ها ناموفق بود");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showForm) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [showForm, editingId]);

  const save = async () => {
    if (!form.title.trim() || !form.brief.trim()) {
      setError("عنوان و بریف کمپین الزامی است.");
      return;
    }

    const isEdit = Boolean(editingId);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        isEdit
          ? `/api/admin/earn/campaigns/${editingId}`
          : "/api/admin/earn/campaigns",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formToPayload(form)),
        }
      );
      const data = (await response.json()) as {
        campaign?: Campaign;
        error?: string;
      };
      if (!response.ok || !data.campaign) {
        setError(
          data.error ||
            (isEdit ? "به‌روزرسانی کمپین ناموفق بود" : "ذخیره کمپین ناموفق بود")
        );
        return;
      }
      const saved = data.campaign;
      setCampaigns((prev) =>
        isEdit
          ? prev.map((campaign) =>
              campaign.id === saved.id ? saved : campaign
            )
          : [saved, ...prev]
      );
      closeForm();
    } catch {
      setError(
        isEdit ? "به‌روزرسانی کمپین ناموفق بود" : "ذخیره کمپین ناموفق بود"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: CampaignStatus) => {
    setUpdatingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/earn/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as {
        campaign?: Campaign;
        error?: string;
      };
      if (!response.ok || !data.campaign) {
        setError(data.error || "به‌روزرسانی کمپین ناموفق بود");
        return;
      }
      const saved = data.campaign;
      setCampaigns((prev) =>
        prev.map((campaign) => (campaign.id === id ? saved : campaign))
      );
      if (editingId === id) {
        setForm((current) => ({ ...current, status: saved.status }));
      }
    } catch {
      setError("به‌روزرسانی کمپین ناموفق بود");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionBadge icon={Plus}>ابزار داخلی تیم</SectionBadge>
        <button
          type="button"
          onClick={openCreate}
          className={cn(brandCta, "px-4 py-2.5 text-sm")}
        >
          <Plus className="size-4" />
          کمپین جدید
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {showForm && (
        <section
          ref={formRef}
          className={cn(brandGlassCard, "space-y-3 p-5")}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">
              {editingId ? "ویرایش کمپین" : "کمپین جدید"}
            </p>
            <p className="text-xs leading-relaxed text-white/40">
              {editingId
                ? "تغییرات روی همین کمپین ذخیره می‌شود. بودجه خرج‌شده عوض نمی‌شود."
                : "اقتصاد پیشنهادی از قبل پر شده: پایه ۴۰۰ هزار، سقف ۲ میلیون، بودجه ۱۵ میلیون، سطوح ۱ک / ۵ک / ۲۰ک / ۵۰ک / ۱۰۰ک بازدید. پاداش هر سطح را می‌توانید دستی عوض کنید."}
            </p>
          </div>
          <Field label="عنوان کمپین">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={cn(fieldClass, formFocus)}
            />
          </Field>
          <Field
            label="توضیح / بریف"
            hint="اگر پر شود، در صفحه کمپین الزامی است"
          >
            <textarea
              value={form.brief}
              onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
              className={cn(fieldClass, formFocus, "min-h-28")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="وضعیت">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as CampaignStatus,
                  }))
                }
                className={cn(fieldClass, formFocus)}
              >
                <option value="draft">پیش‌نویس</option>
                <option value="active">فعال</option>
                <option value="paused">متوقف</option>
                <option value="ended">پایان‌یافته</option>
              </select>
            </Field>
            <Field label="پاداش پایه" hint="۳۰۰٬۰۰۰–۵۰۰٬۰۰۰ تومان">
              <NumberInput
                value={form.basePayoutToman}
                onChange={(basePayoutToman) =>
                  setForm((f) => ({ ...f, basePayoutToman }))
                }
              />
            </Field>
            <Field
              label="سقف هر ویدیو"
              hint="حداکثر پایه + پاداش بازدید یک ویدیو"
            >
              <NumberInput
                value={form.maxPayoutPerVideoToman}
                onChange={(maxPayoutPerVideoToman) =>
                  setForm((f) => ({ ...f, maxPayoutPerVideoToman }))
                }
              />
            </Field>
            <Field
              label="بودجه کل"
              hint={
                editingId
                  ? `خرج‌شده ${formatToman(
                      campaigns.find((c) => c.id === editingId)
                        ?.spentBudgetToman ?? 0
                    )}`
                  : "۱۰–۲۰ میلیون تومان"
              }
            >
              <NumberInput
                value={form.totalBudgetToman}
                onChange={(totalBudgetToman) =>
                  setForm((f) => ({ ...f, totalBudgetToman }))
                }
              />
            </Field>
            <Field label="مهلت کمپین">
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deadline: e.target.value }))
                }
                className={cn(fieldClass, formFocus)}
              />
            </Field>
            <Field label="سقف ارسال هر کاربر">
              <NumberInput
                value={form.maxSubmissionsPerUser}
                onChange={(maxSubmissionsPerUser) =>
                  setForm((f) => ({ ...f, maxSubmissionsPerUser }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.trending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trending: e.target.checked }))
                }
              />
              کمپین داغ
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.tiers.map((row, index) => {
              const last = index === form.tiers.length - 1;
              const level = formatToman(index + 1);
              const stageTotal = payouts.rows[index]?.total ?? null;
              const relation =
                stageTotal != null && payouts.cap > 0
                  ? capRelationLabel(stageTotal, payouts.cap)
                  : null;
              const bonusHint =
                stageTotal == null
                  ? undefined
                  : relation?.tone === "equal"
                    ? `جمع تا اینجا ${formatToman(stageTotal)} · برابر سقف`
                    : relation?.tone === "under"
                      ? `جمع تا اینجا ${formatToman(stageTotal)} · ${formatToman(relation.delta)} کمتر از سقف`
                      : relation
                        ? `جمع تا اینجا ${formatToman(stageTotal)} · ${formatToman(relation.delta)} بیشتر از سقف`
                        : `جمع تا اینجا ${formatToman(stageTotal)}`;
              return (
                <div key={index} className="contents">
                  <Field
                    label={
                      last
                        ? `بازدید سطح ${level} (رویا)`
                        : `بازدید سطح ${level}`
                    }
                  >
                    <NumberInput
                      value={row.views}
                      onChange={(views) =>
                        setForm((f) => ({
                          ...f,
                          tiers: f.tiers.map((tier, i) =>
                            i === index ? { ...tier, views } : tier
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field
                    label={
                      last
                        ? `پاداش سطح ${level} (رویا)`
                        : `پاداش سطح ${level}`
                    }
                    hint={bonusHint}
                    hintClass={
                      relation?.tone === "equal"
                        ? "text-brand"
                        : relation?.tone === "over"
                          ? "text-rose-300"
                          : relation?.tone === "under"
                            ? "text-amber-200/80"
                            : undefined
                    }
                  >
                    <NumberInput
                      value={row.bonus}
                      onChange={(bonus) =>
                        setForm((f) => ({
                          ...f,
                          tiers: f.tiers.map((tier, i) =>
                            i === index ? { ...tier, bonus } : tier
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
              );
            })}
          </div>
          <VideoCapStatus form={form} />
          <Field
            label="چک‌لیست"
            hint="اگر پر شود الزامی است · هر خط یک مورد"
          >
            <textarea
              value={form.requirementsChecklist}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  requirementsChecklist: e.target.value,
                }))
              }
              className={cn(fieldClass, formFocus, "min-h-20")}
            />
          </Field>
          <Field
            label="هشتگ‌های الزامی"
            hint="اگر پر شود باید در کپشن باشد · با کاما جدا کنید"
          >
            <input
              value={form.requiredHashtags}
              onChange={(e) =>
                setForm((f) => ({ ...f, requiredHashtags: e.target.value }))
              }
              className={cn(fieldClass, formFocus)}
            />
          </Field>
          <Field
            label="آیدی / منشن الزامی"
            hint="اگر پر شود باید در پست باشد · با کاما جدا کنید"
          >
            <input
              value={form.requiredMentions}
              onChange={(e) =>
                setForm((f) => ({ ...f, requiredMentions: e.target.value }))
              }
              className={cn(fieldClass, formFocus)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className={cn(brandCta, "px-5 py-2.5 text-sm disabled:opacity-50")}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving
                ? "در حال ذخیره..."
                : editingId
                  ? "ذخیره تغییرات"
                  : "ذخیره کمپین"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className={cn(
                brandCtaGhost,
                "px-5 py-2.5 text-sm disabled:opacity-50"
              )}
            >
              انصراف
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/45">
          هنوز کمپینی ساخته نشده است.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={cn(
                brandGlassCard,
                "p-4",
                editingId === campaign.id && "border-brand/40 ring-1 ring-brand/20"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-white">{campaign.title}</h2>
                    <PlatformBadge platform={campaign.platform} />
                    <StatusPill status={campaign.status} />
                    {campaign.trending && (
                      <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] text-brand">
                        داغ
                      </span>
                    )}
                  </div>
                  <p className="max-w-3xl text-sm text-white/55 line-clamp-2">
                    {campaign.brief}
                  </p>
                  <div className="mt-2 text-xs text-white/40">
                    پایه {formatToman(campaign.basePayoutToman)} · باقی‌مانده{" "}
                    {formatToman(
                      remainingBudgetToman(
                        campaign.spentBudgetToman,
                        campaign.totalBudgetToman
                      )
                    )}
                    /{formatToman(campaign.totalBudgetToman)} ·{" "}
                    {formatDate(campaign.createdAt)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(campaign)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
                  >
                    <Pencil className="size-3" />
                    ویرایش
                  </button>
                  {campaign.status !== "active" && (
                    <button
                      type="button"
                      disabled={updatingId === campaign.id}
                      onClick={() => void updateStatus(campaign.id, "active")}
                      className="rounded-full border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      فعال
                    </button>
                  )}
                  {campaign.status === "active" && (
                    <button
                      type="button"
                      disabled={updatingId === campaign.id}
                      onClick={() => void updateStatus(campaign.id, "paused")}
                      className="rounded-full border border-amber-500/30 px-2.5 py-1 text-xs text-amber-300 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      توقف
                    </button>
                  )}
                  {campaign.status !== "ended" && (
                    <button
                      type="button"
                      disabled={updatingId === campaign.id}
                      onClick={() => void updateStatus(campaign.id, "ended")}
                      className="rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/60 transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                      پایان
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCapStatus({ form }: { form: typeof emptyForm }) {
  const { cap, total, bonusSum, base } = parsedTierPayouts(form);
  if (total == null || cap <= 0) return null;
  const relation = capRelationLabel(total, cap);
  const toneClass =
    relation.tone === "equal"
      ? "border-brand/30 bg-brand/10 text-brand"
      : relation.tone === "under"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
        : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  const message =
    relation.tone === "equal"
      ? `جمع پایه (${formatToman(base)}) و پاداش سطوح (${formatToman(bonusSum)}) برابر سقف هر ویدیو است.`
      : relation.tone === "under"
        ? `جمع پایه و پاداش سطوح ${formatToman(total)} تومان است — ${formatToman(relation.delta)} تومان کمتر از سقف هر ویدیو.`
        : `جمع پایه و پاداش سطوح ${formatToman(total)} تومان است — ${formatToman(relation.delta)} تومان بیشتر از سقف هر ویدیو.`;

  return (
    <p className={cn("rounded-xl border px-3 py-2 text-xs leading-relaxed", toneClass)}>
      {message}
    </p>
  );
}

function NumberInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <input
      inputMode="numeric"
      value={value}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      onChange={(e) => onChange?.(formatGroupedInput(e.target.value))}
      className={cn(
        fieldClass,
        formFocus,
        readOnly && "cursor-default text-white/70"
      )}
    />
  );
}

function Field({
  label,
  hint,
  hintClass,
  children,
}: {
  label: string;
  hint?: string;
  hintClass?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="text-xs text-white/50">{label}</span>
        {hint && (
          <span className={cn("text-[11px] text-white/30", hintClass)}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-white/10 text-white/50",
    active: "bg-emerald-500/15 text-emerald-300",
    paused: "bg-amber-500/15 text-amber-300",
    ended: "bg-white/10 text-white/40",
  };
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    active: "فعال",
    paused: "متوقف",
    ended: "پایان‌یافته",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px]",
        map[status] || "bg-white/10 text-white/50"
      )}
    >
      {labels[status] || status}
    </span>
  );
}

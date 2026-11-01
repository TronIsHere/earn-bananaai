"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Check,
  Flame,
  Loader2,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useAdminRefresh } from "@/components/admin-shell";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPill,
  AdminRefreshButton,
  AdminSegmented,
  AdminSpinnerIcon,
  AdminStat,
  adminBtn,
  adminCard,
  adminField,
  type PillTone,
} from "@/components/admin-ui";
import { PlatformBadge } from "@/components/campaign-card";
import { ProgressBar } from "@/components/progress-bar";
import { formFocus } from "@/lib/brand";
import {
  DEFAULT_CAMPAIGN_BUDGET_TOMAN,
  DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
  DEFAULT_VIEW_BONUS_TIERS,
  EARLY_ACCESS_LEVEL,
  isCampaignInEarlyAccess,
  MIN_PAID_VIEWS,
  remainingBudgetToman,
} from "@/lib/earn";
import {
  MAX_PROMPT_LENGTH,
  MAX_PROMPT_PACK_ITEMS,
  MAX_PROMPT_TITLE_LENGTH,
} from "@/lib/prompt-pack";
import type { Campaign, CampaignStatus, PromptPackItem } from "@/lib/types";
import {
  cn,
  formatDate,
  formatGroupedInput,
  formatToman,
  formatTomanCompact,
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
  toolUrl: "",
  promptPack: [] as PromptPackItem[],
  maxPayoutPerVideoToman: formatToman(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN),
  maxSubmissionsPerUser: formatToman(3),
  totalBudgetToman: formatToman(DEFAULT_CAMPAIGN_BUDGET_TOMAN),
  tiers: defaultTierRows,
  deadline: "",
  earlyAccessUntil: "",
  status: "active" as CampaignStatus,
  trending: false,
};

const fieldClass = adminField;

const statusMeta: Record<CampaignStatus, { label: string; tone: PillTone }> = {
  active: { label: "فعال", tone: "cash" },
  draft: { label: "پیش‌نویس", tone: "neutral" },
  paused: { label: "متوقف", tone: "warn" },
  ended: { label: "پایان‌یافته", tone: "neutral" },
};

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
    toolUrl: campaign.toolUrl ?? "",
    promptPack: (campaign.promptPack ?? []).map((item) => ({ ...item })),
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
    earlyAccessUntil: toDatetimeLocalValue(campaign.earlyAccessUntil ?? null),
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
    toolUrl: form.toolUrl.trim(),
    promptPack: form.promptPack
      .map((item) => ({ title: item.title.trim(), prompt: item.prompt.trim() }))
      .filter((item) => item.title || item.prompt),
    viewBonusTiers: tiers,
    maxPayoutPerVideoToman,
    maxSubmissionsPerUser: parseGroupedNumber(form.maxSubmissionsPerUser) || 3,
    totalBudgetToman: parseGroupedNumber(form.totalBudgetToman) || 0,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    earlyAccessUntil: form.earlyAccessUntil
      ? new Date(form.earlyAccessUntil).toISOString()
      : null,
    status: form.status,
    trending: form.trending,
  };
}

function parsedTierPayouts(form: typeof emptyForm) {
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
      total: hasBonus ? runningBonus : null,
    };
  });
  return {
    cap,
    rows,
    total: runningBonus > 0 ? runningBonus : null,
  };
}

function capRelationLabel(total: number, cap: number) {
  const delta = total - cap;
  if (delta === 0) return { tone: "equal" as const, delta: 0 };
  if (delta < 0) return { tone: "under" as const, delta: -delta };
  return { tone: "over" as const, delta };
}

type CampaignFilter = "all" | CampaignStatus;

const statusOrder: CampaignStatus[] = ["active", "draft", "paused", "ended"];

export function AdminCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CampaignFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const refreshOverview = useAdminRefresh();
  const searchParams = useSearchParams();
  const openedFromLink = useRef(false);
  const payouts = parsedTierPayouts(form);
  const editing = editingId
    ? campaigns.find((c) => c.id === editingId) ?? null
    : null;

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setFormError(null);
  };

  const openEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setForm(campaignToForm(campaign));
    setShowForm(true);
    setFormError(null);
  };

  // Overview shortcut links here with ?new=1.
  useEffect(() => {
    if (openedFromLink.current || searchParams.get("new") !== "1") return;
    const timer = window.setTimeout(() => {
      openedFromLink.current = true;
      setEditingId(null);
      setForm(emptyForm);
      setShowForm(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

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
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.brief.trim()) {
      setFormError("عنوان و بریف کمپین الزامی است.");
      return;
    }

    const isEdit = Boolean(editingId);
    setSaving(true);
    setFormError(null);
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
        setFormError(
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
      refreshOverview();
      closeForm();
    } catch {
      setFormError(
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
      refreshOverview();
    } catch {
      setError("به‌روزرسانی کمپین ناموفق بود");
    } finally {
      setUpdatingId(null);
    }
  };

  const countBy = (status: CampaignStatus) =>
    campaigns.filter((c) => c.status === status).length;
  const visible = campaigns
    .filter((c) => filter === "all" || c.status === filter)
    .sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Megaphone}
        title="کمپین‌ها"
        description={
          campaigns.length > 0
            ? `${formatToman(countBy("active"))} کمپین فعال از ${formatToman(campaigns.length)}`
            : "بریف، بودجه و سطوح پاداش هر کمپین"
        }
        actions={
          <>
            <AdminRefreshButton onClick={() => void load()} loading={loading} />
            <button type="button" onClick={openCreate} className={adminBtn.primary}>
              <Plus className="size-4" />
              کمپین جدید
            </button>
          </>
        }
      />

      {campaigns.length > 0 && (
        <AdminSegmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "همه", count: campaigns.length },
            ...statusOrder.map((status) => ({
              id: status,
              label: statusMeta[status].label,
              count: countBy(status),
            })),
          ]}
        />
      )}

      {error && <AdminError message={error} onRetry={() => void load()} />}

      {loading ? (
        <AdminLoading />
      ) : campaigns.length === 0 ? (
        <AdminEmpty
          icon={Megaphone}
          title="هنوز کمپینی ساخته نشده"
          hint="با «کمپین جدید» اولین بریف و بودجه را بساز."
        />
      ) : visible.length === 0 ? (
        <AdminEmpty icon={Megaphone} title="کمپینی با این وضعیت نیست" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              busy={updatingId === campaign.id}
              disabled={saving}
              onEdit={() => openEdit(campaign)}
              onStatus={(status) => void updateStatus(campaign.id, status)}
            />
          ))}
        </div>
      )}

      <AdminSheet
        open={showForm}
        onClose={() => !saving && closeForm()}
        title={editing ? `ویرایش «${editing.title}»` : "کمپین جدید"}
        description={
          editing
            ? "تغییرات روی همین کمپین ذخیره می‌شود. بودجه خرج‌شده عوض نمی‌شود."
            : `پاداش پایه نداریم: هیچ ریلی زیر ${formatToman(MIN_PAID_VIEWS)} بازدید پولی نمی‌گیرد.`
        }
        footer={
          <>
            {formError && (
              <p className="mb-2 text-sm text-rose-300">{formError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className={adminBtn.primary}
              >
                <AdminSpinnerIcon busy={saving} icon={Check} />
                {saving
                  ? "در حال ذخیره..."
                  : editingId
                    ? "ذخیره تغییرات"
                    : "ساخت کمپین"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className={adminBtn.ghost}
              >
                انصراف
              </button>
            </div>
          </>
        }
      >
        <FormSection title="اطلاعات پایه">
          <Field label="عنوان کمپین">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={cn(fieldClass, formFocus)}
              autoFocus
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
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {statusMeta[status].label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.trending}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trending: e.target.checked }))
                }
                className="size-4 accent-brand"
              />
              <Flame className="size-4 text-brand" />
              کمپین داغ
            </label>
          </div>
        </FormSection>

        <FormSection title="بودجه و زمان">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="بودجه کل (تومان)" hint={editing ? `خرج‌شده ${formatToman(editing.spentBudgetToman)}` : "۱۰–۲۰ میلیون تومان"}>
              <NumberInput
                value={form.totalBudgetToman}
                onChange={(totalBudgetToman) =>
                  setForm((f) => ({ ...f, totalBudgetToman }))
                }
              />
            </Field>
            <Field label="سقف هر ویدیو (تومان)" hint="حداکثر پاداش بازدید یک ویدیو">
              <NumberInput
                value={form.maxPayoutPerVideoToman}
                onChange={(maxPayoutPerVideoToman) =>
                  setForm((f) => ({ ...f, maxPayoutPerVideoToman }))
                }
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
            <Field
              label={`دسترسی زودهنگام سطح ${EARLY_ACCESS_LEVEL.label} تا`}
              hint="خالی یعنی همه از اول می‌توانند شرکت کنند"
            >
              <input
                type="datetime-local"
                value={form.earlyAccessUntil}
                onChange={(e) =>
                  setForm((f) => ({ ...f, earlyAccessUntil: e.target.value }))
                }
                className={cn(fieldClass, formFocus)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="سطوح پاداش بازدید"
          hint="پاداش هر سطح روی سطح قبلی جمع می‌شود. سطح آخر سطح رویاست."
        >
          <div className="overflow-hidden rounded-xl border border-white/8">
            <div className="grid grid-cols-[3rem_1fr_1fr_6.5rem] gap-2 border-b border-white/6 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">
              <span>سطح</span>
              <span>از بازدید</span>
              <span>پاداش (تومان)</span>
              <span className="text-left">جمع تا اینجا</span>
            </div>
            <div className="divide-y divide-white/6">
              {form.tiers.map((row, index) => {
                const last = index === form.tiers.length - 1;
                const stageTotal = payouts.rows[index]?.total ?? null;
                const relation =
                  stageTotal != null && payouts.cap > 0
                    ? capRelationLabel(stageTotal, payouts.cap)
                    : null;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-[3rem_1fr_1fr_6.5rem] items-center gap-2 px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-white/60">
                      {formatToman(index + 1)}
                      {last && <span className="block text-[10px] font-normal text-brand">رویا</span>}
                    </span>
                    <NumberInput
                      ariaLabel={`بازدید سطح ${formatToman(index + 1)}`}
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
                    <NumberInput
                      ariaLabel={`پاداش سطح ${formatToman(index + 1)}`}
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
                    <span
                      className={cn(
                        "text-left text-xs tabular-nums",
                        stageTotal == null
                          ? "text-white/25"
                          : relation?.tone === "over"
                            ? "text-rose-300"
                            : relation?.tone === "equal"
                              ? "text-brand"
                              : "text-white/70"
                      )}
                    >
                      {stageTotal == null ? "-" : formatTomanCompact(stageTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <VideoCapStatus form={form} />
        </FormSection>

        <FormSection title="الزامات انتشار" hint="هر فیلدی که پر شود برای سازنده الزامی است">
          <Field label="چک‌لیست" hint="هر خط یک مورد">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="هشتگ‌های الزامی" hint="با کاما جدا کنید">
              <input
                value={form.requiredHashtags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requiredHashtags: e.target.value }))
                }
                className={cn(fieldClass, formFocus)}
              />
            </Field>
            <Field label="آیدی / منشن الزامی" hint="با کاما جدا کنید">
              <input
                value={form.requiredMentions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requiredMentions: e.target.value }))
                }
                className={cn(fieldClass, formFocus)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="ابزار و پرامپت‌ها">
          <Field
            label="لینک ابزار بنانا"
            hint="اختیاری · با https شروع شود · {prompt} جای متن پرامپت می‌نشیند"
          >
            <input
              value={form.toolUrl}
              onChange={(e) => setForm((f) => ({ ...f, toolUrl: e.target.value }))}
              placeholder="https://.../create?prompt={prompt}"
              dir="ltr"
              className={cn(fieldClass, formFocus, "text-left")}
            />
          </Field>
          <PromptPackEditor
            rows={form.promptPack}
            onChange={(promptPack) => setForm((f) => ({ ...f, promptPack }))}
          />
        </FormSection>
      </AdminSheet>
    </div>
  );
}

function CampaignRow({
  campaign,
  busy,
  disabled,
  onEdit,
  onStatus,
}: {
  campaign: Campaign;
  busy: boolean;
  disabled: boolean;
  onEdit: () => void;
  onStatus: (status: CampaignStatus) => void;
}) {
  const remaining = remainingBudgetToman(
    campaign.spentBudgetToman,
    campaign.totalBudgetToman
  );
  const spentPct =
    campaign.totalBudgetToman > 0
      ? (campaign.spentBudgetToman / campaign.totalBudgetToman) * 100
      : 0;
  return (
    <article
      className={cn(
        adminCard,
        "flex flex-col overflow-hidden",
        campaign.status === "active" && "border-white/12"
      )}
    >
      <div className="flex-1 space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={campaign.status} />
          <PlatformBadge platform={campaign.platform} />
          {campaign.trending && (
            <AdminPill tone="brand" icon={Flame}>
              داغ
            </AdminPill>
          )}
          {isCampaignInEarlyAccess(campaign) && (
            <AdminPill tone="brand">
              زودهنگام {EARLY_ACCESS_LEVEL.label} تا{" "}
              {formatDate(campaign.earlyAccessUntil ?? null)}
            </AdminPill>
          )}
        </div>
        <div>
          <h2 className="font-bold text-white">{campaign.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-white/50">{campaign.brief}</p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="text-white/45">
              خرج‌شده {formatToman(Math.round(spentPct))}٪
            </span>
            <span className="tabular-nums text-white/55">
              <span className="font-bold text-white">{formatTomanCompact(remaining)}</span>
              {" باقی‌مانده از "}
              {formatTomanCompact(campaign.totalBudgetToman)}
            </span>
          </div>
          <ProgressBar
            value={spentPct}
            className={spentPct >= 90 ? "bg-rose-400" : spentPct >= 70 ? "bg-amber-300" : undefined}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/20 px-3 py-2">
          <AdminStat
            label="سقف هر ویدیو"
            value={formatTomanCompact(campaign.maxPayoutPerVideoToman)}
          />
          <AdminStat
            label="مهلت"
            value={campaign.deadline ? formatDate(campaign.deadline) : "بدون مهلت"}
            tone="muted"
          />
          <AdminStat label="ساخته شده" value={formatDate(campaign.createdAt)} tone="muted" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/6 bg-black/20 px-4 py-2.5 sm:px-5">
        <button type="button" disabled={disabled} onClick={onEdit} className={adminBtn.small}>
          <Pencil className="size-3" />
          ویرایش
        </button>
        <span className="mr-auto" />
        {busy && <Loader2 className="size-3.5 animate-spin text-white/40" />}
        {campaign.status !== "active" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("active")}
            className={cn(adminBtn.small, "border-cash/30 text-cash hover:bg-cash/10")}
          >
            <Play className="size-3" />
            فعال کردن
          </button>
        )}
        {campaign.status === "active" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("paused")}
            className={cn(adminBtn.small, "border-amber-500/30 text-amber-200 hover:bg-amber-500/10")}
          >
            <Pause className="size-3" />
            توقف
          </button>
        )}
        {campaign.status !== "ended" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("ended")}
            className={adminBtn.small}
          >
            <Square className="size-3" />
            پایان
          </button>
        )}
      </div>
    </article>
  );
}

/** Slide-over panel from the left edge (RTL end side). */
function AdminSheet({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal: an animated (transformed) ancestor would otherwise clip `fixed`.
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="بستن"
      />
      <div className="absolute inset-y-0 left-0 flex w-full max-w-2xl flex-col border-r border-white/8 bg-[#0b0c0c] shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-white/45">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="بستن"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        <div className="border-t border-white/8 bg-black/40 px-5 py-3">{footer}</div>
      </div>
    </div>,
    document.body
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-white/6 pb-2">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {hint && <span className="text-[11px] text-white/35">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function PromptPackEditor({
  rows,
  onChange,
}: {
  rows: PromptPackItem[];
  onChange: (rows: PromptPackItem[]) => void;
}) {
  const update = (index: number, patch: Partial<PromptPackItem>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <fieldset className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <legend className="text-xs text-white/50">پرامپت‌های آماده</legend>
        <span className="text-[11px] text-white/30">
          اختیاری · سازنده‌ها کپی یا مستقیم در بنانا باز می‌کنند · حداکثر{" "}
          {formatToman(MAX_PROMPT_PACK_ITEMS)} مورد
        </span>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={row.title}
              onChange={(e) => update(index, { title: e.target.value })}
              maxLength={MAX_PROMPT_TITLE_LENGTH}
              placeholder="عنوان، مثلاً ریل معرفی محصول"
              aria-label="عنوان پرامپت"
              className={cn(fieldClass, formFocus)}
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              aria-label="حذف پرامپت"
              className="shrink-0 rounded-xl border border-white/10 p-2.5 text-white/50 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <textarea
            value={row.prompt}
            onChange={(e) => update(index, { prompt: e.target.value })}
            maxLength={MAX_PROMPT_LENGTH}
            placeholder="متن پرامپت"
            aria-label="متن پرامپت"
            className={cn(fieldClass, formFocus, "min-h-24")}
          />
        </div>
      ))}
      {rows.length < MAX_PROMPT_PACK_ITEMS && (
        <button
          type="button"
          onClick={() => onChange([...rows, { title: "", prompt: "" }])}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/65 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Plus className="size-3.5" />
          افزودن پرامپت
        </button>
      )}
    </fieldset>
  );
}

function VideoCapStatus({ form }: { form: typeof emptyForm }) {
  const { cap, total } = parsedTierPayouts(form);
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
      ? `جمع پاداش سطوح (${formatToman(total)}) برابر سقف هر ویدیو است.`
      : relation.tone === "under"
        ? `جمع پاداش سطوح ${formatToman(total)} تومان است؛ ${formatToman(relation.delta)} تومان کمتر از سقف هر ویدیو.`
        : `جمع پاداش سطوح ${formatToman(total)} تومان است؛ ${formatToman(relation.delta)} تومان بیشتر از سقف هر ویدیو.`;

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
  ariaLabel,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      inputMode="numeric"
      aria-label={ariaLabel}
      value={value}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      onChange={(e) => onChange?.(formatGroupedInput(e.target.value))}
      className={cn(
        fieldClass,
        formFocus,
        "tabular-nums",
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
        <span className="text-xs font-medium text-white/60">{label}</span>
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

function StatusPill({ status }: { status: CampaignStatus }) {
  const meta = statusMeta[status] ?? { label: status, tone: "neutral" as const };
  return (
    <AdminPill tone={meta.tone}>
      {status === "active" && (
        <span className="relative inline-flex size-1.5 rounded-full bg-cash earn-live" />
      )}
      {meta.label}
    </AdminPill>
  );
}

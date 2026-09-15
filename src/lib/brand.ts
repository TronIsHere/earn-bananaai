/** BananaAI Earn brand system: near-black surfaces, high-contrast lime accent,
 * flat (non-glass) cards, 16 to 24px corners. Money numbers are big and
 * tabular; lime is reserved for "cash" and primary actions. */

export const brandCta =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand text-brand-ink font-bold shadow-[0_2px_18px_rgba(209,254,23,0.28)] transition-all duration-200 hover:bg-brand-soft hover:shadow-[0_4px_26px_rgba(209,254,23,0.4)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const brandCtaGlow =
  "earn-sheen inline-flex items-center justify-center gap-2 rounded-2xl bg-brand text-brand-ink font-bold shadow-[0_0_30px_rgba(209,254,23,0.32)] hover:bg-brand-soft hover:shadow-[0_0_44px_rgba(209,254,23,0.45)] transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const brandCtaGhost =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] text-white/85 hover:bg-white/[0.08] hover:border-white/25 font-semibold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

/** Dark CTA used on top of lime panels. */
export const brandCtaInk =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-ink text-brand font-bold shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-all duration-200 hover:bg-black active:scale-[0.97]";

/** Strong off-white headline (bold, no color gradient). */
export const brandHeadlineGradient = "text-white";

/** Flat lime tint used behind icons inside cards/badges. */
export const brandIconBg = "bg-brand/12";

export const brandAccentText = "text-brand";

export const formFocus =
  "focus:border-brand/60 focus:ring-2 focus:ring-brand/20 transition-[border-color,box-shadow] duration-150";

/** Standard text input. Pair with `formFocus`. */
export const formInput =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-white/30";

/** Small pill label, e.g. "برنامه رسمی کسب درآمد". */
export const brandBadge =
  "inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-brand";

/** Flat dark surface used for cards across the app (no glass/blur). */
export const brandGlassCard = "rounded-2xl border border-white/8 bg-surface";

export const brandGlassCardHover =
  "transition-all duration-200 hover:border-brand/30 hover:bg-surface-hover hover:shadow-[0_12px_34px_rgba(0,0,0,0.55)]";

/** Larger flat panel used for hero/spotlight sections. */
export const brandGlowPanel =
  "relative overflow-hidden rounded-3xl border border-white/8 bg-surface";

/** Hero panel with a lime mesh wash. */
export const brandMeshPanel =
  "earn-mesh relative overflow-hidden rounded-3xl border border-brand/15";

/** Solid lime spotlight panel; use `text-brand-ink` inside. */
export const brandLimePanel =
  "earn-lime relative overflow-hidden rounded-3xl border border-brand-soft/40";

export const brandDivider = "border-white/8";

/** Section eyebrow + title pair used across pages. */
export const sectionTitle = "text-xl font-extrabold text-white sm:text-2xl";
export const sectionLead = "text-sm leading-relaxed text-white/55 sm:text-base";

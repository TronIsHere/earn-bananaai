/** BananaAI brand system — "Earn" program, matched to Higgsfield Earn's
 * actual dark, near-black + high-contrast lime accent aesthetic, flat
 * (non-glass) surfaces, and 16–24px rounded corners. */

export const brandCta =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand text-brand-ink font-bold shadow-[0_2px_16px_rgba(209,254,23,0.25)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]";

export const brandCtaGlow =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand text-brand-ink font-bold shadow-[0_0_28px_rgba(209,254,23,0.3)] hover:shadow-[0_0_38px_rgba(209,254,23,0.4)] hover:brightness-110 transition-all duration-200 active:scale-[0.97]";

export const brandCtaGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/25 font-semibold transition-all duration-200 active:scale-[0.97]";

/** Strong off-white headline, Higgsfield-style (bold, no color gradient). */
export const brandHeadlineGradient = "text-white";

/** Flat lime tint used behind icons inside cards/badges. */
export const brandIconBg = "bg-brand/12";

export const brandAccentText = "text-brand";

export const formFocus = "focus:border-brand/50 focus:ring-1 focus:ring-brand/25";

/** Small pill label, e.g. "برنامه رسمی کسب درآمد". */
export const brandBadge =
  "inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-brand";

/** Flat dark surface used for cards across the app (no glass/blur). */
export const brandGlassCard = "rounded-2xl border border-white/8 bg-surface";

export const brandGlassCardHover =
  "transition-all duration-200 hover:border-brand/30 hover:bg-surface-hover hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]";

/** Larger flat panel used for hero/spotlight sections. */
export const brandGlowPanel =
  "relative overflow-hidden rounded-3xl border border-white/8 bg-surface";

export const brandDivider = "border-white/8";

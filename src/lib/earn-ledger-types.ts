/** Client-safe ledger constants and JSON shapes. Do not import Mongoose here. */

export const EARN_LEDGER_TYPES = [
  "base_credit",
  "bonus_credit",
  "clawback",
  "payout_request",
  "payout_paid",
  "payout_reversal",
  "adjustment",
] as const;

export type EarnLedgerType = (typeof EARN_LEDGER_TYPES)[number];

export const ledgerTypeLabel: Record<EarnLedgerType, string> = {
  base_credit: "پاداش پایه",
  bonus_credit: "پاداش بازدید",
  clawback: "برگشت پاداش",
  payout_request: "درخواست واریز",
  payout_paid: "واریز به حساب",
  payout_reversal: "برگشت درخواست واریز",
  adjustment: "تعدیل حساب",
};

export interface UserLedgerEntryJson {
  id: string;
  type: EarnLedgerType;
  balanceDelta: number;
  earnedDelta: number;
  paidOutDelta: number;
  balanceAfter: number;
  campaignTitle: string | null;
  note: string | null;
  createdAt: string;
}

export interface UserLedgerPageJson {
  entries: UserLedgerEntryJson[];
  nextCursor: string | null;
}

/** The one number a creator cares about for a row. */
export function ledgerDisplayAmount(entry: {
  type: EarnLedgerType;
  balanceDelta: number;
  paidOutDelta: number;
}): number {
  return entry.type === "payout_paid" ? entry.paidOutDelta : entry.balanceDelta;
}

export interface WalletTotalsJson {
  balance: number;
  lifetimeEarned: number;
  lifetimePaidOut: number;
}

export interface WalletReconcileRowJson {
  userId: string;
  name: string;
  mobileNumber: string;
  stored: WalletTotalsJson;
  ledger: WalletTotalsJson;
  drift: WalletTotalsJson;
  entryCount: number;
  fixed: boolean;
}

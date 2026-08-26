import { MIN_PAYOUT_TOMAN } from "./earn";
import type { BillingEntry, Profile, Submission, Wallet } from "./types";

export { MIN_PAYOUT_TOMAN };

export const emptyWallet: Wallet = {
  available: 0,
  lifetimeEarned: 0,
  lifetimePaidOut: 0,
};

export const emptyProfile: Profile = {
  firstName: "",
  lastName: "",
  mobileNumber: "",
  instagramHandle: null,
  youtubeHandle: null,
  instagramStatus: "none",
  youtubeStatus: "none",
  verificationCode: "",
  verificationNote: null,
  verificationRequestedAt: null,
};

function storageKey(userId: string) {
  return `earn-bananaai-v1:${userId}`;
}

export interface AppState {
  submissions: Submission[];
  billing: BillingEntry[];
  wallet: Wallet;
  profile: Profile;
}

export function defaultState(): AppState {
  return {
    submissions: [],
    billing: [],
    wallet: emptyWallet,
    profile: emptyProfile,
  };
}

export function loadState(userId?: string): AppState {
  if (typeof window === "undefined" || !userId) return defaultState();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...defaultState(),
      ...parsed,
      profile: { ...emptyProfile, ...parsed.profile },
      wallet: { ...emptyWallet, ...parsed.wallet },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState, userId?: string) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

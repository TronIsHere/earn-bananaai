"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { Profile, Wallet } from "@/lib/types";
import {
  defaultState,
  loadState,
  saveState,
  type AppState,
} from "@/lib/store";

type StoreContextValue = {
  ready: boolean;
  state: AppState;
  isAdmin: boolean;
  updateProfile: (patch: Partial<Profile>) => void;
  persistProfile: () => Promise<boolean>;
  updateWallet: (wallet: Wallet) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function profileFromUser(user: {
  id?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  instagramHandle?: string | null;
  youtubeHandle?: string | null;
  instagramStatus?: Profile["instagramStatus"];
  youtubeStatus?: Profile["youtubeStatus"];
  verificationCode?: string;
  verificationNote?: string | null;
  verificationRequestedAt?: string | null;
}): Partial<Profile> {
  return {
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    mobileNumber: user.mobileNumber ?? "",
    instagramHandle: user.instagramHandle ?? null,
    youtubeHandle: user.youtubeHandle ?? null,
    instagramStatus: user.instagramStatus ?? "none",
    youtubeStatus: user.youtubeStatus ?? "none",
    verificationCode: user.verificationCode ?? "",
    verificationNote: user.verificationNote ?? null,
    verificationRequestedAt: user.verificationRequestedAt ?? null,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(defaultState);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;

    async function hydrate() {
      if (!userId || !session?.user) {
        setState(defaultState());
        setReady(true);
        return;
      }

      const local = loadState(userId);
      let profile: Profile = {
        ...local.profile,
        ...profileFromUser(session.user),
      };
      let wallet = local.wallet;

      try {
        const response = await fetch("/api/user/me");
        if (response.ok) {
          const me = await response.json();
          profile = { ...profile, ...profileFromUser(me) };
          if (me.earnWallet) {
            wallet = me.earnWallet;
          }
        }
      } catch {
        // Keep session + local profile if the API is temporarily unavailable.
      }

      if (cancelled) return;
      setState({ ...local, profile, wallet });
      setReady(true);
    }

    setReady(false);
    hydrate();

    return () => {
      cancelled = true;
    };
  }, [status, userId, session]);

  useEffect(() => {
    if (!ready || !userId) return;
    saveState(state, userId);
  }, [ready, state, userId]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
    }));
  }, []);

  const persistProfile = useCallback(async () => {
    const response = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: state.profile.firstName,
        lastName: state.profile.lastName,
      }),
    });

    if (!response.ok) return false;

    const me = await response.json();
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profileFromUser(me) },
    }));
    return true;
  }, [state.profile]);

  const updateWallet = useCallback((wallet: Wallet) => {
    setState((prev) => ({ ...prev, wallet }));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      state,
      isAdmin: Boolean(session?.user?.isAdmin),
      updateProfile,
      persistProfile,
      updateWallet,
    }),
    [
      ready,
      state,
      session?.user?.isAdmin,
      updateProfile,
      persistProfile,
      updateWallet,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

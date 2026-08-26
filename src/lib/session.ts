import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!session) return { ok: false as const, status: 401 as const };
  if (!session.user.isAdmin) return { ok: false as const, status: 403 as const };
  return { ok: true as const, session };
}

export async function requireAdminSession() {
  const session = await requireSession();
  if (!session) {
    return { session: null, error: "unauthorized" as const };
  }
  if (!session.user.isAdmin) {
    return { session: null, error: "forbidden" as const };
  }
  return { session, error: null };
}

export function publicUser(user: {
  _id: { toString(): string };
  mobileNumber: string;
  firstName: string;
  lastName: string;
  role?: string | null;
  earnInstagramHandle?: string | null;
  youtubeHandle?: string | null;
  earnVerificationStatus?: string;
  youtubeStatus?: string;
  earnVerificationCode?: string | null;
  earnVerificationNote?: string | null;
  earnVerificationRequestedAt?: Date | null;
  updatedAt?: Date | null;
  earnWalletBalance?: number;
  earnWalletLifetimeEarned?: number;
  earnWalletLifetimePaidOut?: number;
}) {
  return {
    id: user._id.toString(),
    mobileNumber: user.mobileNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    instagramHandle: user.earnInstagramHandle ?? null,
    youtubeHandle: user.youtubeHandle ?? null,
    instagramStatus: user.earnVerificationStatus ?? "none",
    youtubeStatus: user.youtubeStatus ?? "none",
    verificationCode: user.earnVerificationCode ?? "",
    verificationNote: user.earnVerificationNote ?? null,
    verificationRequestedAt: user.earnVerificationRequestedAt
      ? user.earnVerificationRequestedAt.toISOString()
      : user.earnVerificationStatus === "pending" && user.updatedAt
        ? user.updatedAt.toISOString()
        : null,
    earnWallet: {
      available: user.earnWalletBalance ?? 0,
      lifetimeEarned: user.earnWalletLifetimeEarned ?? 0,
      lifetimePaidOut: user.earnWalletLifetimePaidOut ?? 0,
    },
  };
}

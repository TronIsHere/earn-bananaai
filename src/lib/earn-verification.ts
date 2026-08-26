import "server-only";
import { instagramProfileUrl } from "@/lib/instagram";
import type { EarnVerificationStatus } from "@/lib/earn";

export function toVerificationDto(user: {
  earnInstagramHandle?: string | null;
  earnVerificationCode?: string | null;
  earnVerificationStatus?: string | null;
  earnVerificationNote?: string | null;
  earnVerifiedAt?: Date | null;
  earnVerificationRequestedAt?: Date | null;
  updatedAt?: Date | null;
}) {
  const handle = user.earnInstagramHandle ?? null;
  const status = (user.earnVerificationStatus ?? "none") as EarnVerificationStatus;
  const requested =
    user.earnVerificationRequestedAt ??
    (status === "pending" ? user.updatedAt ?? null : null);
  return {
    handle,
    code: user.earnVerificationCode ?? null,
    status,
    note: user.earnVerificationNote ?? null,
    verifiedAt: user.earnVerifiedAt ? user.earnVerifiedAt.toISOString() : null,
    requestedAt: requested ? requested.toISOString() : null,
    profileUrl: handle ? instagramProfileUrl(handle) : null,
  };
}

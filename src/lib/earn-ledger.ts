import "server-only";
import mongoose, { type Types } from "mongoose";
import type {
  EarnLedgerType,
  UserLedgerEntryJson,
  UserLedgerPageJson,
  WalletReconcileRowJson,
  WalletTotalsJson,
} from "@/lib/earn-ledger-types";
import connectDB, { isMongoDuplicateKey } from "@/lib/mongodb";
import EarnLedgerEntry, {
  type IEarnLedgerEntry,
} from "@/models/earn-ledger-entry";
import User from "@/models/user";

type IdLike = Types.ObjectId | string;

/** What the caller knows about a wallet movement, beyond the amount. */
export interface LedgerRef {
  campaignId?: IdLike | null;
  submissionId?: IdLike | null;
  payoutId?: IdLike | null;
  actorId?: IdLike | null;
  note?: string | null;
  /** Makes the entry at-most-once. A second write with the same key is dropped. */
  idempotencyKey?: string;
}

export interface RecordLedgerEntryParams {
  userId: IdLike;
  type: EarnLedgerType;
  balanceDelta: number;
  earnedDelta?: number;
  paidOutDelta?: number;
  balanceAfter: number;
  ref?: LedgerRef;
}

/** `undefined` for a missing id so the schema default (null) applies. */
function toObjectId(value: IdLike | null | undefined) {
  if (!value) return undefined;
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

/**
 * Appends a ledger row. The wallet change it describes has already been
 * applied, so this never throws: failing the caller here would leave money
 * moved with the surrounding rollback logic unaware. A write that is lost is
 * logged and shows up as drift in `reconcileWallets`.
 */
export async function recordLedgerEntry(
  params: RecordLedgerEntryParams
): Promise<void> {
  const { ref } = params;
  try {
    await connectDB();
    await EarnLedgerEntry.create({
      userId: toObjectId(params.userId),
      type: params.type,
      balanceDelta: params.balanceDelta,
      earnedDelta: params.earnedDelta ?? 0,
      paidOutDelta: params.paidOutDelta ?? 0,
      balanceAfter: params.balanceAfter,
      campaignId: toObjectId(ref?.campaignId),
      submissionId: toObjectId(ref?.submissionId),
      payoutId: toObjectId(ref?.payoutId),
      actorId: toObjectId(ref?.actorId),
      note: ref?.note ?? null,
      ...(ref?.idempotencyKey ? { idempotencyKey: ref.idempotencyKey } : {}),
    });
  } catch (error) {
    if (isMongoDuplicateKey(error)) return;
    console.error("[earn-ledger] failed to record entry", {
      userId: String(params.userId),
      type: params.type,
      balanceDelta: params.balanceDelta,
      error,
    });
  }
}

type PopulatedCampaign = { _id: Types.ObjectId; title?: string };
type LedgerLean = Omit<IEarnLedgerEntry, "campaignId"> & {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId | PopulatedCampaign | null;
};

function campaignTitleOf(value: LedgerLean["campaignId"]): string | null {
  if (value && typeof value === "object" && "title" in value) {
    return value.title ?? null;
  }
  return null;
}

export function serializeLedgerEntry(doc: LedgerLean): UserLedgerEntryJson {
  return {
    id: doc._id.toString(),
    type: doc.type,
    balanceDelta: doc.balanceDelta,
    earnedDelta: doc.earnedDelta,
    paidOutDelta: doc.paidOutDelta,
    balanceAfter: doc.balanceAfter,
    campaignTitle: campaignTitleOf(doc.campaignId),
    note: doc.note ?? null,
    createdAt: (doc.createdAt instanceof Date
      ? doc.createdAt
      : new Date(doc.createdAt)
    ).toISOString(),
  };
}

export const LEDGER_PAGE_SIZE = 30;

/** Newest first. `before` is the id of the last row of the previous page. */
export async function listUserLedger(
  userId: string,
  options: { before?: string | null; limit?: number } = {}
): Promise<UserLedgerPageJson> {
  await connectDB();
  const limit = Math.min(Math.max(options.limit ?? LEDGER_PAGE_SIZE, 1), 100);
  const filter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
  };
  if (options.before) {
    filter._id = { $lt: new mongoose.Types.ObjectId(options.before) };
  }

  const rows = await EarnLedgerEntry.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate({ path: "campaignId", select: "title" })
    .lean<LedgerLean[]>();

  const page = rows.slice(0, limit);
  return {
    entries: page.map(serializeLedgerEntry),
    nextCursor:
      rows.length > limit ? page[page.length - 1]._id.toString() : null,
  };
}

interface LedgerSums extends WalletTotalsJson {
  entryCount: number;
}

const ZERO_SUMS: LedgerSums = {
  balance: 0,
  lifetimeEarned: 0,
  lifetimePaidOut: 0,
  entryCount: 0,
};

async function ledgerSumsByUser(
  userId?: string
): Promise<Map<string, LedgerSums>> {
  const rows = await EarnLedgerEntry.aggregate<{
    _id: Types.ObjectId;
    balance: number;
    earned: number;
    paidOut: number;
    count: number;
  }>([
    ...(userId
      ? [{ $match: { userId: new mongoose.Types.ObjectId(userId) } }]
      : []),
    {
      $group: {
        _id: "$userId",
        balance: { $sum: "$balanceDelta" },
        earned: { $sum: "$earnedDelta" },
        paidOut: { $sum: "$paidOutDelta" },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(
    rows.map((row) => [
      row._id.toString(),
      {
        balance: row.balance,
        lifetimeEarned: row.earned,
        lifetimePaidOut: row.paidOut,
        entryCount: row.count,
      },
    ])
  );
}

const WALLET_FIELDS =
  "firstName lastName mobileNumber earnWalletBalance earnWalletLifetimeEarned earnWalletLifetimePaidOut";

/**
 * Compares each wallet on the user document with the sum of its ledger rows.
 * With `fix`, a drifted wallet gets one `adjustment` row for the difference so
 * the ledger agrees with the stored wallet again. The stored wallet is treated
 * as correct, which is right for legacy balances that predate the ledger; run
 * it when no money is moving, otherwise an in-flight change looks like drift.
 */
export async function reconcileWallets(
  options: { userId?: string; fix?: boolean } = {}
): Promise<WalletReconcileRowJson[]> {
  await connectDB();
  const sums = await ledgerSumsByUser(options.userId);

  const userFilter = options.userId
    ? { _id: new mongoose.Types.ObjectId(options.userId) }
    : {
        $or: [
          { earnWalletBalance: { $gt: 0 } },
          { earnWalletLifetimeEarned: { $gt: 0 } },
          { earnWalletLifetimePaidOut: { $gt: 0 } },
          { _id: { $in: [...sums.keys()].map((id) => new mongoose.Types.ObjectId(id)) } },
        ],
      };
  const users = await User.find(userFilter).select(WALLET_FIELDS).lean();

  const rows: WalletReconcileRowJson[] = [];
  for (const user of users) {
    const id = user._id.toString();
    const ledger = sums.get(id) ?? ZERO_SUMS;
    const stored: WalletTotalsJson = {
      balance: user.earnWalletBalance ?? 0,
      lifetimeEarned: user.earnWalletLifetimeEarned ?? 0,
      lifetimePaidOut: user.earnWalletLifetimePaidOut ?? 0,
    };
    const drift: WalletTotalsJson = {
      balance: stored.balance - ledger.balance,
      lifetimeEarned: stored.lifetimeEarned - ledger.lifetimeEarned,
      lifetimePaidOut: stored.lifetimePaidOut - ledger.lifetimePaidOut,
    };
    const drifted =
      drift.balance !== 0 ||
      drift.lifetimeEarned !== 0 ||
      drift.lifetimePaidOut !== 0;
    if (!drifted && !options.userId) continue;

    let fixed = false;
    if (drifted && options.fix) {
      await EarnLedgerEntry.create({
        userId: user._id,
        type: "adjustment",
        balanceDelta: drift.balance,
        earnedDelta: drift.lifetimeEarned,
        paidOutDelta: drift.lifetimePaidOut,
        balanceAfter: stored.balance,
        note:
          ledger.entryCount === 0
            ? "موجودی اولیه پیش از فعال شدن دفتر حساب"
            : "تطبیق دفتر حساب با کیف پول",
      });
      fixed = true;
    }

    rows.push({
      userId: id,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      mobileNumber: user.mobileNumber ?? "",
      stored,
      ledger: {
        balance: ledger.balance,
        lifetimeEarned: ledger.lifetimeEarned,
        lifetimePaidOut: ledger.lifetimePaidOut,
      },
      drift,
      entryCount: ledger.entryCount,
      fixed,
    });
  }
  return rows;
}

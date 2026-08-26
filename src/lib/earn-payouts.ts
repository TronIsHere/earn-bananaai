import "server-only";
import type { Types } from "mongoose";
import { MIN_PAYOUT_TOMAN, type EarnPayoutStatus } from "@/lib/earn";
import {
  EarnWalletError,
  markEarnPayoutPaid,
  refundEarnPayout,
  reserveEarnPayout,
} from "@/lib/earn-wallet";
import connectDB, { isMongoDuplicateKey } from "@/lib/mongodb";
import EarnPayout, { type IEarnPayout } from "@/models/earn-payout";
import User from "@/models/user";

export type PayoutErrorCode =
  | "BELOW_MINIMUM"
  | "INSUFFICIENT_BALANCE"
  | "PENDING_EXISTS"
  | "PAYOUT_NOT_FOUND"
  | "ALREADY_REVIEWED"
  | "USER_NOT_FOUND"
  | "INVALID_AMOUNT";

export class PayoutError extends Error {
  constructor(
    message: string,
    public readonly code: PayoutErrorCode,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = "PayoutError";
  }
}

type PayoutLean = IEarnPayout & { _id: Types.ObjectId };

type PopulatedUser = {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function serializePayout(
  payout: PayoutLean,
  user?: PopulatedUser | null
) {
  const populated =
    user && typeof user === "object" && "firstName" in user ? user : null;
  return {
    id: payout._id.toString(),
    amount: payout.amount,
    bankNote: payout.bankNote,
    status: payout.status,
    adminNote: payout.adminNote,
    paidAt: toIso(payout.paidAt),
    reviewedAt: toIso(payout.reviewedAt),
    createdAt: toIso(payout.createdAt) ?? new Date().toISOString(),
    user: populated
      ? {
          id: populated._id.toString(),
          firstName: populated.firstName ?? "",
          lastName: populated.lastName ?? "",
          mobileNumber: populated.mobileNumber ?? "",
        }
      : null,
  };
}

export async function listUserPayouts(userId: string) {
  await connectDB();
  const rows = await EarnPayout.find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return rows.map((row) => serializePayout(row as PayoutLean));
}

export async function requestEarnPayout(params: {
  userId: string;
  amount: number;
  bankNote: string;
}) {
  await connectDB();

  const pending = await EarnPayout.findOne({
    userId: params.userId,
    status: "pending",
  }).lean();
  if (pending) {
    throw new PayoutError(
      "یک درخواست واریز در انتظار بررسی دارید. تا تعیین وضعیت آن نمی‌توانید درخواست جدید ثبت کنید.",
      "PENDING_EXISTS",
      400
    );
  }

  let reserved;
  try {
    reserved = await reserveEarnPayout(params.userId, params.amount);
  } catch (error) {
    throw mapWalletError(error);
  }

  try {
    const payout = await EarnPayout.create({
      userId: params.userId,
      amount: params.amount,
      bankNote: params.bankNote,
      status: "pending",
    });
    return {
      payout: serializePayout(payout.toObject() as PayoutLean),
      wallet: reserved,
    };
  } catch (error) {
    await refundEarnPayout(params.userId, params.amount).catch(() => undefined);
    if (isMongoDuplicateKey(error)) {
      throw new PayoutError(
        "یک درخواست واریز در انتظار بررسی دارید. تا تعیین وضعیت آن نمی‌توانید درخواست جدید ثبت کنید.",
        "PENDING_EXISTS",
        400
      );
    }
    throw error;
  }
}

export async function listAdminPayouts(status?: string | null) {
  await connectDB();
  const filter =
    status && status !== "all"
      ? { status: status as EarnPayoutStatus }
      : {};

  const oldestFirst = status === "pending";
  const rows = await EarnPayout.find(filter)
    .populate({
      path: "userId",
      select: "firstName lastName mobileNumber",
    })
    .sort(oldestFirst ? { createdAt: 1 } : { createdAt: -1 })
    .limit(200)
    .lean();

  return rows.map((row) => {
    const user =
      row.userId && typeof row.userId === "object" && "firstName" in row.userId
        ? (row.userId as unknown as PopulatedUser)
        : null;
    return serializePayout(
      {
        ...(row as unknown as PayoutLean),
        userId:
          user?._id ??
          (row.userId as Types.ObjectId),
      },
      user
    );
  });
}

export async function reviewEarnPayout(params: {
  payoutId: string;
  reviewerId: string;
  decision: "pay" | "reject";
  note?: string;
}) {
  await connectDB();

  const payout = await EarnPayout.findById(params.payoutId);
  if (!payout) {
    throw new PayoutError("درخواست واریز پیدا نشد.", "PAYOUT_NOT_FOUND", 404);
  }
  if (payout.status !== "pending") {
    throw new PayoutError(
      "فقط درخواست‌های در انتظار بررسی قابل تأیید یا رد هستند.",
      "ALREADY_REVIEWED",
      400
    );
  }

  if (params.decision === "pay") {
    const updated = await EarnPayout.findOneAndUpdate(
      { _id: payout._id, status: "pending" },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          reviewedBy: params.reviewerId,
          reviewedAt: new Date(),
          adminNote: params.note?.trim() || null,
        },
      },
      { new: true }
    );
    if (!updated) {
      throw new PayoutError(
        "فقط درخواست‌های در انتظار بررسی قابل تأیید یا رد هستند.",
        "ALREADY_REVIEWED",
        400
      );
    }

    let wallet;
    try {
      wallet = await markEarnPayoutPaid(payout.userId, payout.amount);
    } catch (error) {
      throw mapWalletError(error);
    }

    return {
      payout: serializePayout(updated.toObject() as PayoutLean),
      wallet,
    };
  }

  const updated = await EarnPayout.findOneAndUpdate(
    { _id: payout._id, status: "pending" },
    {
      $set: {
        status: "rejected",
        reviewedBy: params.reviewerId,
        reviewedAt: new Date(),
        adminNote: params.note?.trim() || null,
        paidAt: null,
      },
    },
    { new: true }
  );
  if (!updated) {
    throw new PayoutError(
      "فقط درخواست‌های در انتظار بررسی قابل تأیید یا رد هستند.",
      "ALREADY_REVIEWED",
      400
    );
  }

  let wallet;
  try {
    wallet = await refundEarnPayout(payout.userId, payout.amount);
  } catch (error) {
    throw mapWalletError(error);
  }

  return {
    payout: serializePayout(updated.toObject() as PayoutLean),
    wallet,
  };
}

function mapWalletError(error: unknown): PayoutError {
  if (error instanceof EarnWalletError) {
    if (error.code === "BELOW_MINIMUM") {
      return new PayoutError(
        `حداقل مبلغ درخواست واریز ${MIN_PAYOUT_TOMAN.toLocaleString("fa-IR")} تومان است.`,
        "BELOW_MINIMUM",
        400
      );
    }
    if (error.code === "INSUFFICIENT_BALANCE") {
      return new PayoutError("موجودی کیف پول کافی نیست.", "INSUFFICIENT_BALANCE", 400);
    }
    if (error.code === "USER_NOT_FOUND") {
      return new PayoutError("کاربر پیدا نشد.", "USER_NOT_FOUND", 404);
    }
  }
  if (error instanceof PayoutError) return error;
  throw error;
}

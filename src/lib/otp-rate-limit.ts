/**
 * OTP send rate limits (per phone + per IP) to stop SMS bombing / Kavenegar cost abuse.
 */

import "server-only";
import type { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import OtpRateLimit from "@/models/otp-rate-limit";
import { normalizePhoneNumber } from "@/lib/phone";

export const OTP_PHONE_COOLDOWN_MS = 60 * 1000;
export const OTP_PHONE_MAX_PER_HOUR = 5;
export const OTP_PHONE_MAX_PER_DAY = 10;
export const OTP_IP_MAX_PER_HOUR = 10;
export const OTP_IP_MAX_PER_DAY = 40;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TTL_MS = 48 * HOUR_MS;

export const OTP_RATE_LIMITED_CODE = "otp_rate_limited";

export type OtpRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      code: typeof OTP_RATE_LIMITED_CODE;
      error: string;
      retryAfterSeconds: number;
    };

function phoneKey(mobileNumber: string): string {
  return `phone:${normalizePhoneNumber(mobileNumber)}`;
}

function ipKey(ip: string): string {
  return `ip:${ip}`;
}

export function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

function retrySecondsUntil(from: Date, windowMs: number, now: Date): number {
  const elapsed = now.getTime() - from.getTime();
  return Math.max(Math.ceil((windowMs - elapsed) / 1000), 1);
}

function denied(
  error: string,
  retryAfterSeconds: number
): Extract<OtpRateLimitResult, { allowed: false }> {
  return {
    allowed: false,
    code: OTP_RATE_LIMITED_CODE,
    error,
    retryAfterSeconds,
  };
}

type QuotaMessages = {
  cooldownMessage: string;
  hourMessage: string;
  dayMessage: string;
};

const PHONE_MESSAGES: QuotaMessages = {
  cooldownMessage: "لطفاً کمی صبر کنید و دوباره برای دریافت کد تلاش کنید.",
  hourMessage:
    "تعداد درخواست کد برای این شماره در یک ساعت زیاد شده است. بعداً تلاش کنید.",
  dayMessage:
    "تعداد درخواست کد برای این شماره امروز به سقف رسیده است. فردا دوباره تلاش کنید.",
};

const IP_MESSAGES: QuotaMessages = {
  cooldownMessage: "لطفاً کمی صبر کنید و دوباره برای دریافت کد تلاش کنید.",
  hourMessage:
    "تعداد درخواست‌ها از این اتصال زیاد شده است. کمی بعد دوباره تلاش کنید.",
  dayMessage:
    "تعداد درخواست‌ها از این اتصال امروز به سقف رسیده است. فردا دوباره تلاش کنید.",
};

export async function consumeOtpSendQuota(
  mobileNumber: string,
  ip: string | null
): Promise<OtpRateLimitResult> {
  await connectDB();

  const now = new Date();
  const phone = phoneKey(mobileNumber);
  const ipScope = ip ? ipKey(ip) : null;

  const phoneExisting = await OtpRateLimit.findOne({ key: phone });
  if (phoneExisting) {
    const phoneDenied = evaluateLimits({
      existing: phoneExisting,
      now,
      cooldownMs: OTP_PHONE_COOLDOWN_MS,
      hourLimit: OTP_PHONE_MAX_PER_HOUR,
      dayLimit: OTP_PHONE_MAX_PER_DAY,
      messages: PHONE_MESSAGES,
    });
    if (phoneDenied) return phoneDenied;
  }

  if (ipScope) {
    const ipExisting = await OtpRateLimit.findOne({ key: ipScope });
    if (ipExisting) {
      const ipDenied = evaluateLimits({
        existing: ipExisting,
        now,
        cooldownMs: 0,
        hourLimit: OTP_IP_MAX_PER_HOUR,
        dayLimit: OTP_IP_MAX_PER_DAY,
        messages: IP_MESSAGES,
      });
      if (ipDenied) return ipDenied;
    }
  }

  const phoneResult = await consumeKeyQuota({
    key: phone,
    now,
    cooldownMs: OTP_PHONE_COOLDOWN_MS,
    hourLimit: OTP_PHONE_MAX_PER_HOUR,
    dayLimit: OTP_PHONE_MAX_PER_DAY,
    messages: PHONE_MESSAGES,
  });

  if (!phoneResult.allowed) return phoneResult;
  if (!ipScope) return { allowed: true };

  return consumeKeyQuota({
    key: ipScope,
    now,
    cooldownMs: 0,
    hourLimit: OTP_IP_MAX_PER_HOUR,
    dayLimit: OTP_IP_MAX_PER_DAY,
    messages: IP_MESSAGES,
  });
}

async function consumeKeyQuota(options: {
  key: string;
  now: Date;
  cooldownMs: number;
  hourLimit: number;
  dayLimit: number;
  messages: QuotaMessages;
}): Promise<OtpRateLimitResult> {
  const { key, now, cooldownMs, hourLimit, dayLimit, messages } = options;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await OtpRateLimit.findOne({ key });

    if (!existing) {
      try {
        await OtpRateLimit.create({
          key,
          lastSentAt: now,
          hourWindowStart: now,
          hourCount: 1,
          dayWindowStart: now,
          dayCount: 1,
          expiresAt: new Date(now.getTime() + TTL_MS),
        });
        return { allowed: true };
      } catch (error: unknown) {
        if (isDuplicateKey(error)) continue;
        throw error;
      }
    }

    const deniedReason = evaluateLimits({
      existing,
      now,
      cooldownMs,
      hourLimit,
      dayLimit,
      messages,
    });
    if (deniedReason) return deniedReason;

    const hourExpired =
      now.getTime() - existing.hourWindowStart.getTime() >= HOUR_MS;
    const dayExpired =
      now.getTime() - existing.dayWindowStart.getTime() >= DAY_MS;

    const updated = await OtpRateLimit.findOneAndUpdate(
      {
        _id: existing._id,
        lastSentAt: existing.lastSentAt,
        hourCount: existing.hourCount,
        dayCount: existing.dayCount,
      },
      {
        $set: {
          lastSentAt: now,
          hourWindowStart: hourExpired ? now : existing.hourWindowStart,
          hourCount: hourExpired ? 1 : existing.hourCount + 1,
          dayWindowStart: dayExpired ? now : existing.dayWindowStart,
          dayCount: dayExpired ? 1 : existing.dayCount + 1,
          expiresAt: new Date(now.getTime() + TTL_MS),
        },
      },
      { new: true }
    );

    if (updated) return { allowed: true };
  }

  return denied(messages.cooldownMessage, Math.ceil(cooldownMs / 1000) || 60);
}

function evaluateLimits(options: {
  existing: {
    lastSentAt: Date;
    hourWindowStart: Date;
    hourCount: number;
    dayWindowStart: Date;
    dayCount: number;
  };
  now: Date;
  cooldownMs: number;
  hourLimit: number;
  dayLimit: number;
  messages: QuotaMessages;
}): Extract<OtpRateLimitResult, { allowed: false }> | null {
  const { existing, now, cooldownMs, hourLimit, dayLimit, messages } = options;

  if (
    cooldownMs > 0 &&
    now.getTime() - existing.lastSentAt.getTime() < cooldownMs
  ) {
    return denied(
      messages.cooldownMessage,
      retrySecondsUntil(existing.lastSentAt, cooldownMs, now)
    );
  }

  const hourActive =
    now.getTime() - existing.hourWindowStart.getTime() < HOUR_MS;
  if (hourActive && existing.hourCount >= hourLimit) {
    return denied(
      messages.hourMessage,
      retrySecondsUntil(existing.hourWindowStart, HOUR_MS, now)
    );
  }

  const dayActive = now.getTime() - existing.dayWindowStart.getTime() < DAY_MS;
  if (dayActive && existing.dayCount >= dayLimit) {
    return denied(
      messages.dayMessage,
      retrySecondsUntil(existing.dayWindowStart, DAY_MS, now)
    );
  }

  return null;
}

function isDuplicateKey(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

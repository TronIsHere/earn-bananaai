import "server-only";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import OTP from "@/models/otp";
import { sendOTPWithKavenegar } from "@/lib/kavenegar";
import { normalizePhoneNumber } from "@/lib/phone";

const OTP_EXPIRY_SECONDS = 120;
const MAX_ATTEMPTS = 5;

export { normalizePhoneNumber };

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOTP(code: string): string {
  const secret =
    process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET || "default-secret";
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

export function compareOTP(storedHash: string, providedCode: string): boolean {
  const providedHash = hashOTP(providedCode);
  return crypto.timingSafeEqual(
    Buffer.from(storedHash),
    Buffer.from(providedHash)
  );
}

export async function sendOTP(mobileNumber: string): Promise<{
  success: boolean;
  expiresAt: Date;
  error?: string;
}> {
  try {
    await connectDB();

    const normalizedMobile = normalizePhoneNumber(mobileNumber);
    const otpCode = generateOTP();
    const hashedCode = hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    await OTP.deleteMany({ mobileNumber: normalizedMobile });
    await OTP.create({
      mobileNumber: normalizedMobile,
      hashedCode,
      expiresAt,
      attempts: 0,
    });

    try {
      await sendOTPWithKavenegar({
        receptor: normalizedMobile,
        token: otpCode,
      });

      return { success: true, expiresAt };
    } catch (error) {
      await OTP.deleteMany({ mobileNumber: normalizedMobile });
      const message =
        error instanceof Error ? error.message : "Failed to send OTP";
      console.error("Failed to send OTP via Kavenegar:", error);
      return { success: false, expiresAt, error: message };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error in sendOTP:", error);
    return { success: false, expiresAt: new Date(), error: message };
  }
}

export async function verifyOTP(
  mobileNumber: string,
  otpCode: string,
  deleteOnSuccess = true
): Promise<{
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
}> {
  try {
    await connectDB();
    const normalizedMobile = normalizePhoneNumber(mobileNumber);

    const otpRecord = await OTP.findOne({
      mobileNumber: normalizedMobile,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return {
        valid: false,
        error: "کد تأیید پیدا نشد. لطفاً دوباره درخواست کنید.",
      };
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        error: "کد تأیید منقضی شده است. لطفاً دوباره درخواست کنید.",
      };
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return {
        valid: false,
        error: "تعداد تلاش‌های مجاز تمام شده است. لطفاً کد جدید درخواست کنید.",
        attemptsRemaining: 0,
      };
    }

    const isValid = compareOTP(otpRecord.hashedCode, otpCode);

    if (isValid) {
      if (deleteOnSuccess) {
        await OTP.deleteOne({ _id: otpRecord._id });
      }
      return { valid: true };
    }

    otpRecord.attempts += 1;
    await otpRecord.save();

    return {
      valid: false,
      error: "کد تأیید نامعتبر است.",
      attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "خطای داخلی سرور";
    console.error("Error in verifyOTP:", error);
    return { valid: false, error: message };
  }
}

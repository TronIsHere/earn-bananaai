import { NextRequest, NextResponse } from "next/server";
import { mobileNumberSchema } from "@/lib/validations";
import { sendOTP } from "@/lib/otp-service";
import { consumeOtpSendQuota, getRequestIp } from "@/lib/otp-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = mobileNumberSchema.safeParse(body.mobileNumber);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const mobileNumber = validation.data;
    const rateLimit = await consumeOtpSendQuota(
      mobileNumber,
      getRequestIp(request)
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.error,
          code: rateLimit.code,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const result = await sendOTP(mobileNumber);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "خطا در ارسال کد تأیید" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "کد تأیید با موفقیت ارسال شد",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "خطای داخلی سرور";
    console.error("Error sending OTP:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

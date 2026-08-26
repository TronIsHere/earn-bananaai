import { NextRequest, NextResponse } from "next/server";
import { otpSchema, mobileNumberSchema } from "@/lib/validations";
import connectDB from "@/lib/mongodb";
import User from "@/models/user";
import { verifyOTP } from "@/lib/otp-service";
import { publicUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mobileValidation = mobileNumberSchema.safeParse(body.mobileNumber);
    const otpValidation = otpSchema.safeParse(body.otp);

    if (!mobileValidation.success) {
      return NextResponse.json(
        { error: mobileValidation.error.issues[0].message },
        { status: 400 }
      );
    }

    if (!otpValidation.success) {
      return NextResponse.json(
        { error: otpValidation.error.issues[0].message },
        { status: 400 }
      );
    }

    const mobileNumber = mobileValidation.data;
    const verificationResult = await verifyOTP(mobileNumber, body.otp, false);

    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          error: verificationResult.error || "کد تأیید نامعتبر است",
          attemptsRemaining: verificationResult.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ mobileNumber });

    if (user) {
      return NextResponse.json({
        success: true,
        userExists: true,
        user: publicUser(user),
      });
    }

    return NextResponse.json({
      success: true,
      userExists: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "خطای داخلی سرور";
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

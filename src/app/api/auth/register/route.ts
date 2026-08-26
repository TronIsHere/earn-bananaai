import { NextRequest, NextResponse } from "next/server";
import {
  mobileNumberSchema,
  otpSchema,
  firstNameSchema,
  lastNameSchema,
} from "@/lib/validations";
import connectDB from "@/lib/mongodb";
import User from "@/models/user";
import { verifyOTP } from "@/lib/otp-service";
import { isAdminMobile } from "@/lib/admin-mobiles";
import { publicUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mobileValidation = mobileNumberSchema.safeParse(body.mobileNumber);
    const otpValidation = otpSchema.safeParse(body.otp);
    const firstNameValidation = firstNameSchema.safeParse(body.firstName);
    const lastNameValidation = lastNameSchema.safeParse(body.lastName);

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
    if (!firstNameValidation.success) {
      return NextResponse.json(
        { error: firstNameValidation.error.issues[0].message },
        { status: 400 }
      );
    }
    if (!lastNameValidation.success) {
      return NextResponse.json(
        { error: lastNameValidation.error.issues[0].message },
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

    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      return NextResponse.json(
        { error: "کاربر با این شماره موبایل قبلاً ثبت‌نام کرده است" },
        { status: 400 }
      );
    }

    const newUser = await User.create({
      mobileNumber,
      firstName: firstNameValidation.data.trim(),
      lastName: lastNameValidation.data.trim(),
      role: isAdminMobile(mobileNumber) ? "admin" : "user",
    });

    return NextResponse.json(
      {
        success: true,
        user: publicUser(newUser),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error registering user:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "کاربر با این شماره موبایل قبلاً ثبت‌نام کرده است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "خطای داخلی سرور" },
      { status: 500 }
    );
  }
}

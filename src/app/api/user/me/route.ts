import { NextRequest, NextResponse } from "next/server";
import connectDB, { isMongoDuplicateKey } from "@/lib/mongodb";
import User from "@/models/user";
import { requireSession, publicUser } from "@/lib/session";
import { profileUpdateSchema } from "@/lib/validations";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  }

  return NextResponse.json({
    ...publicUser(user),
    isAdmin: session.user.isAdmin,
    role: session.user.role,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "کاربر پیدا نشد" }, { status: 404 });
  }

  const { firstName, lastName } = parsed.data;

  if (firstName) user.firstName = firstName.trim();
  if (lastName) user.lastName = lastName.trim();

  try {
    await user.save();
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return NextResponse.json(
        {
          error:
            "این نام کاربری اینستاگرام قبلاً برای حساب دیگری ثبت شده است.",
        },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json(publicUser(user));
}

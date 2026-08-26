import { NextRequest, NextResponse } from "next/server";
import { Day7Error, listAdminSubmissions } from "@/lib/earn-day7";
import { requireAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await requireAdminSession();
  if (access.error === "unauthorized") {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }
  if (access.error === "forbidden") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("status");

  try {
    const submissions = await listAdminSubmissions(status);
    return NextResponse.json({ submissions });
  } catch (error) {
    if (error instanceof Day7Error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error listing earn submissions:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

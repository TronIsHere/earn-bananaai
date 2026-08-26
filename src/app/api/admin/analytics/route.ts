import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  try {
    const analytics = await getAnalyticsSummary();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error loading analytics:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

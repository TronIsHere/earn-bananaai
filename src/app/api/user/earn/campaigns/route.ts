import { NextResponse } from "next/server";
import { listPublicCampaigns } from "@/lib/earn-campaigns";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  try {
    const campaigns = await listPublicCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error listing public campaigns:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

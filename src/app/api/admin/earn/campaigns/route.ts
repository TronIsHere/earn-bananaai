import { NextRequest, NextResponse } from "next/server";
import {
  CampaignError,
  createCampaign,
  listAdminCampaigns,
} from "@/lib/earn-campaigns";
import { requireAdmin } from "@/lib/session";
import { createCampaignSchema } from "@/lib/validations";

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
    const campaigns = await listAdminCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error listing admin campaigns:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "اطلاعات کمپین نامعتبر است" },
      { status: 400 }
    );
  }

  try {
    const campaign = await createCampaign({
      ...parsed.data,
      createdBy: auth.session.user.id,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

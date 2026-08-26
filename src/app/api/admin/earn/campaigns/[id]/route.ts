import { NextRequest, NextResponse } from "next/server";
import { CampaignError, updateCampaign } from "@/lib/earn-campaigns";
import { requireAdmin } from "@/lib/session";
import { mongoIdSchema, updateCampaignSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  const { id } = await context.params;
  const idParsed = mongoIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "اطلاعات کمپین نامعتبر است" },
      { status: 400 }
    );
  }

  try {
    const campaign = await updateCampaign(idParsed.data, parsed.data);
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof CampaignError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error updating campaign:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

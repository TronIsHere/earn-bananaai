import { NextRequest, NextResponse } from "next/server";
import { reconcileWallets } from "@/lib/earn-ledger";
import { requireAdmin } from "@/lib/session";
import { mongoIdSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

async function run(request: NextRequest, fix: boolean) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "وارد شوید" : "دسترسی مجاز نیست" },
      { status: auth.status }
    );
  }

  let userId: string | undefined;
  const userIdParam = request.nextUrl.searchParams.get("userId");
  if (userIdParam) {
    const parsed = mongoIdSchema.safeParse(userIdParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }
    userId = parsed.data;
  }

  try {
    const rows = await reconcileWallets({ userId, fix });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Error reconciling wallets:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

/** Dry run: lists wallets whose ledger sum differs from the stored balance. */
export function GET(request: NextRequest) {
  return run(request, false);
}

/** Writes one `adjustment` row per drifted wallet so the ledger matches again. */
export function POST(request: NextRequest) {
  return run(request, true);
}

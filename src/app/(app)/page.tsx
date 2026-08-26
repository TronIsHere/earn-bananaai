import { getServerSession } from "next-auth/next";
import { DashboardHome } from "./dashboard-home";
import { LandingPage } from "@/components/landing-page";
import { authOptions } from "@/lib/auth-config";
import { listPublicCampaigns } from "@/lib/earn-campaigns";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return <DashboardHome />;
  }

  let campaigns: {
    id: string;
    title: string;
    basePayoutToman: number;
    maxPayoutPerVideoToman: number;
    trending?: boolean;
  }[] = [];

  try {
    campaigns = (await listPublicCampaigns()).slice(0, 2).map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      basePayoutToman: campaign.basePayoutToman,
      maxPayoutPerVideoToman: campaign.maxPayoutPerVideoToman,
      trending: campaign.trending,
    }));
  } catch {
    campaigns = [];
  }

  return <LandingPage campaigns={campaigns} />;
}

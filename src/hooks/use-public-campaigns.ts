"use client";

import { useCallback, useEffect, useState } from "react";
import type { Campaign } from "@/lib/types";

export function usePublicCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user/earn/campaigns");
      const data = (await response.json()) as {
        campaigns?: Campaign[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error || "بارگذاری کمپین‌ها ناموفق بود");
        setCampaigns([]);
        return;
      }
      setCampaigns(data.campaigns ?? []);
    } catch {
      setError("بارگذاری کمپین‌ها ناموفق بود");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { campaigns, loading, error, reload };
}

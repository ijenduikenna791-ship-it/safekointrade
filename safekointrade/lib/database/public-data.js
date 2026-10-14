import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { defaultPlans, defaultAssets } from "@/lib/config/defaults";

/** Active plans for the marketing site. `isDefault` tells the UI to label them. */
export async function getPublicPlans() {
  const supabase = createPublicClient();
  if (!supabase) return { plans: defaultPlans, isDefault: true };
  const { data, error } = await supabase
    .from("investment_plans")
    .select("id, slug, name, description, min_amount, max_amount, currency, term_days, risk_level, risk_description, target_return_min, target_return_max, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return { plans: defaultPlans, isDefault: true };
  return { plans: data, isDefault: false };
}

export async function getPublicAssets() {
  const supabase = createPublicClient();
  if (!supabase) return defaultAssets;
  const { data, error } = await supabase
    .from("supported_assets")
    .select("symbol, name, coingecko_id, network, accepts_deposits")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return defaultAssets;
  return data;
}

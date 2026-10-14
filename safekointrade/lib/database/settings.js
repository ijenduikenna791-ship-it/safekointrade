import "server-only";
import { toNumber } from "@/lib/utils/format";

const DEFAULTS = {
  deposit_min: 10,
  deposit_max: 1000000,
  withdrawal_min: 20,
  withdrawal_max: 50000,
  withdrawal_fee_flat: 2,
  withdrawal_fee_percent: 0.5,
  maintenance_mode: false,
  registrations_open: true,
};

/** Public settings readable by signed-in users (RLS: is_public). Falls back to defaults. */
export async function getPublicSettings(supabase) {
  const { data } = await supabase.from("application_settings").select("key, value").eq("is_public", true);
  const out = { ...DEFAULTS };
  for (const row of data || []) out[row.key] = typeof DEFAULTS[row.key] === "number" ? toNumber(row.value) : row.value;
  return out;
}

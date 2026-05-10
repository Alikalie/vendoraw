import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FX_URL = "https://api.exchangerate-api.com/v4/latest/USD";

/**
 * Refresh USD-base exchange rates from the public endpoint and upsert into DB.
 * If the fetch fails, returns ok:false but does not throw — keeps existing rates.
 * Public so cron + admin button can both call it; idempotent.
 */
export const refreshExchangeRates = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const res = await fetch(FX_URL, {
      headers: { accept: "application/json" },
      // Worker fetch — no node options needed.
    });
    if (!res.ok) {
      return { ok: false as const, error: `Upstream ${res.status}`, updated: 0 };
    }
    const json = (await res.json()) as { base?: string; rates?: Record<string, number> };
    const rates = json?.rates ?? {};
    const rows = Object.entries(rates)
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .map(([currency, rate]) => ({ currency, rate, updated_at: new Date().toISOString() }));
    if (!rows.length) return { ok: false as const, error: "Empty response", updated: 0 };
    // Always include USD baseline
    rows.push({ currency: "USD", rate: 1, updated_at: new Date().toISOString() });
    const { error } = await supabaseAdmin
      .from("exchange_rates")
      .upsert(rows, { onConflict: "currency" });
    if (error) return { ok: false as const, error: error.message, updated: 0 };
    return { ok: true as const, updated: rows.length, fetchedAt: new Date().toISOString() };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "fx fetch failed",
      updated: 0,
    };
  }
});

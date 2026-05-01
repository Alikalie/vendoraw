import { supabase } from "@/integrations/supabase/client";
import { usdRates } from "@/data/countries";

// In-memory cache of USD->currency rates, hydrated from DB once per session.
let cache: Record<string, number> | null = null;
let inflight: Promise<Record<string, number>> | null = null;

export async function loadRates(): Promise<Record<string, number>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("exchange_rates" as never)
      .select("currency,rate");
    const map: Record<string, number> = { ...usdRates };
    ((data as { currency: string; rate: number }[] | null) ?? []).forEach((r) => {
      map[r.currency] = Number(r.rate);
    });
      cache = map;
      // Expose to legacy convertFromUsd consumers.
      (globalThis as unknown as { __fxCache?: Record<string, number> }).__fxCache = map;
      inflight = null;
      return map;
  })();
  return inflight;
}

export function getCachedRate(currency: string): number {
  if (cache && cache[currency] != null) return cache[currency];
  return usdRates[currency] ?? 1;
}

export function convertUsd(amountUsd: number, to: string): number {
  return amountUsd * getCachedRate(to);
}

export function convertToUsd(amount: number, from: string): number {
  const r = getCachedRate(from);
  return r === 0 ? amount : amount / r;
}

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const usd = convertToUsd(amount, from);
  return convertUsd(usd, to);
}

export function clearFxCache() { cache = null; }

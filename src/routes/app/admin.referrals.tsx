import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/data/countries";
import { Loader2, Search, Users } from "lucide-react";

export const Route = createFileRoute("/app/admin/referrals")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles" as never).select("role").eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: Page,
});

type P = { id: string; first_name: string; last_name: string; email: string | null; referral_code: string; referred_by: string | null; currency: string; balance: number };
type Bonus = { user_id: string; amount: number; currency: string };

function Page() {
  const [rows, setRows] = useState<P[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("id,first_name,last_name,email,referral_code,referred_by,currency,balance")
        .order("created_at", { ascending: false }).limit(1000);
      setRows((data as P[]) ?? []);
      const { data: b } = await supabase.from("transactions")
        .select("user_id,amount,currency").eq("type", "referral").eq("status", "completed");
      setBonuses((b as Bonus[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const indexById = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);
  const childrenOf = useMemo(() => {
    const m: Record<string, P[]> = {};
    rows.forEach((r) => { if (r.referred_by) (m[r.referred_by] ??= []).push(r); });
    return m;
  }, [rows]);
  const earnedByUser = useMemo(() => {
    const m: Record<string, number> = {};
    bonuses.forEach((b) => { m[b.user_id] = (m[b.user_id] ?? 0) + Number(b.amount); });
    return m;
  }, [bonuses]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = rows.filter((r) => (childrenOf[r.id] ?? []).length > 0);
    if (!term) return list;
    return list.filter((r) => `${r.first_name} ${r.last_name} ${r.email ?? ""} ${r.referral_code}`.toLowerCase().includes(term));
  }, [rows, q, childrenOf]);

  const totalBonus = bonuses.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Referrals" subtitle="Admin" fallbackTo="/app/admin" />
      <h1 className="text-xl font-bold">Referrals</h1>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Referrers" value={String(filtered.length)} />
        <Stat label="Referred users" value={String(rows.filter((r) => r.referred_by).length)} />
        <Stat label="Bonuses paid" value={formatMoney(totalBonus, "USD")} />
      </div>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by referrer name, email, code"
          className="w-full rounded-xl border border-border bg-background/30 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
      </div>
      <div className="mt-4 space-y-2">
        {loading && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…</div>}
        {!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No referrers yet.</div>}
        {filtered.map((r) => {
          const kids = childrenOf[r.id] ?? [];
          return (
            <details key={r.id} className="rounded-2xl border border-border bg-card p-3">
              <summary className="flex cursor-pointer items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{r.first_name} {r.last_name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.email ?? ""} · code <span className="font-mono">{r.referral_code}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{kids.length}</div>
                  <div className="text-[10px] text-muted-foreground">{formatMoney(earnedByUser[r.id] ?? 0, r.currency)} earned</div>
                </div>
              </summary>
              <ul className="mt-3 space-y-1 border-t border-border pt-2">
                {kids.map((k) => (
                  <li key={k.id} className="flex items-center justify-between rounded-lg bg-background/30 px-2 py-1.5 text-[11px]">
                    <span className="truncate">{k.first_name} {k.last_name}</span>
                    <span className="text-muted-foreground">{k.email ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
      {/* hidden util reference to avoid TS warning */}
      <span className="hidden">{Object.keys(indexById).length}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

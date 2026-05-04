import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/data/countries";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/app/admin/investments")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles" as never).select("role").eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: Page,
});

type Inv = {
  id: string; user_id: string; product_id: string; status: string;
  purchase_price: number; daily_earning: number; total_return: number;
  duration_days: number; earnings_paid_count: number; earnings_accrued: number;
  start_date: string; end_date: string;
};
type Profile = { id: string; first_name: string; last_name: string; email: string | null; currency: string };
type Product = { id: string; name: string };

function Page() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "completed">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("investments")
        .select("id,user_id,product_id,status,purchase_price,daily_earning,total_return,duration_days,earnings_paid_count,earnings_accrued,start_date,end_date")
        .order("start_date", { ascending: false }).limit(500);
      const inv = (data as Inv[]) ?? [];
      setRows(inv);
      const uIds = Array.from(new Set(inv.map((r) => r.user_id)));
      const pIds = Array.from(new Set(inv.map((r) => r.product_id)));
      const [pr, pp] = await Promise.all([
        uIds.length ? supabase.from("profiles").select("id,first_name,last_name,email,currency").in("id", uIds) : Promise.resolve({ data: [] as Profile[] }),
        pIds.length ? supabase.from("products").select("id,name").in("id", pIds) : Promise.resolve({ data: [] as Product[] }),
      ]);
      const pMap: Record<string, Profile> = {}; (pr.data as Profile[] ?? []).forEach((p) => { pMap[p.id] = p; });
      const prMap: Record<string, Product> = {}; (pp.data as Product[] ?? []).forEach((p) => { prMap[p.id] = p; });
      setProfiles(pMap); setProducts(prMap); setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!term) return true;
      const p = profiles[r.user_id];
      const pr = products[r.product_id];
      return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""} ${pr?.name ?? ""}`.toLowerCase().includes(term);
    });
  }, [rows, q, tab, profiles, products]);

  const totals = useMemo(() => ({
    invested: rows.reduce((s, r) => s + Number(r.purchase_price), 0),
    payout: rows.reduce((s, r) => s + Number(r.total_return), 0),
    paid: rows.reduce((s, r) => s + Number(r.earnings_accrued), 0),
    active: rows.filter((r) => r.status === "active").length,
  }), [rows]);

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Investments" subtitle="Admin" fallbackTo="/app/admin" />
      <h1 className="text-xl font-bold">Investments</h1>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Active" value={String(totals.active)} />
        <Stat label="Invested" value={formatMoney(totals.invested, "USD")} />
        <Stat label="Promised" value={formatMoney(totals.payout, "USD")} />
        <Stat label="Paid out" value={formatMoney(totals.paid, "USD")} />
      </div>

      <div className="mt-4 flex gap-2">
        {(["all", "active", "completed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, email, product…"
          className="w-full rounded-xl border border-border bg-background/30 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
      </div>

      <div className="mt-4 space-y-2">
        {loading && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…</div>}
        {!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No investments match.</div>}
        {filtered.map((r) => {
          const p = profiles[r.user_id]; const pr = products[r.product_id];
          const cur = p?.currency ?? "USD";
          const progress = Math.min(100, Math.round((r.earnings_paid_count / Math.max(1, r.duration_days)) * 100));
          return (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{p ? `${p.first_name} ${p.last_name}` : r.user_id.slice(0, 8)}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{pr?.name ?? "—"} · {p?.email ?? ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatMoney(Number(r.purchase_price), cur)}</div>
                  <span className={`text-[10px] capitalize font-medium ${r.status === "active" ? "text-success" : "text-muted-foreground"}`}>{r.status}</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px] text-muted-foreground">
                <Stat label="Daily" value={formatMoney(Number(r.daily_earning), cur)} />
                <Stat label="Total payout" value={formatMoney(Number(r.total_return), cur)} />
                <Stat label="Paid days" value={`${r.earnings_paid_count}/${r.duration_days}`} />
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </article>
          );
        })}
      </div>
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

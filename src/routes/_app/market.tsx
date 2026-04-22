import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { convertFromUsd, formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { Clock, TrendingUp, ShieldCheck } from "lucide-react";

type Product = {
  id: string; name: string; description: string | null; price: number;
  daily_earning: number; duration_days: number; total_return: number; risk_level: string;
};

export const Route = createFileRoute("/_app/market")({
  component: MarketTab,
});

function MarketTab() {
  const { profile, refreshProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("products").select("*").eq("active", true).order("price");
    setProducts((data as Product[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  if (!profile) return null;
  const cur = profile.currency;

  const buy = async (p: Product) => {
    const localPrice = convertFromUsd(p.price, cur);
    if (profile.balance < localPrice) {
      return toast.error(`Insufficient balance. Need ${formatMoney(localPrice, cur)}`);
    }
    setBusy(p.id);
    const localDaily = convertFromUsd(p.daily_earning, cur);
    const localReturn = convertFromUsd(p.total_return, cur);
    const end = new Date(Date.now() + p.duration_days * 86400000).toISOString();

    const { error: invErr } = await supabase.from("investments").insert({
      user_id: profile.id,
      product_id: p.id,
      purchase_price: localPrice,
      daily_earning: localDaily,
      duration_days: p.duration_days,
      total_return: localReturn,
      end_date: end,
    });
    if (invErr) { setBusy(null); return toast.error(invErr.message); }

    await supabase.from("transactions").insert({
      user_id: profile.id, type: "buy", amount: localPrice, currency: cur,
      description: `Purchased ${p.name}`,
    });
    await supabase.from("profiles").update({ balance: profile.balance - localPrice }).eq("id", profile.id);
    await refreshProfile();
    setBusy(null);
    toast.success(`${p.name} added to your portfolio`);
  };

  return (
    <div className="px-5 pt-6 pb-6">
      <h1 className="text-xl font-bold">Market</h1>
      <p className="mt-1 text-xs text-muted-foreground">Simulated products. Returns are not guaranteed.</p>

      <div className="mt-5 space-y-3">
        {products.map((p) => {
          const localPrice = convertFromUsd(p.price, cur);
          const localDaily = convertFromUsd(p.daily_earning, cur);
          const localReturn = convertFromUsd(p.total_return, cur);
          return (
            <div key={p.id} className="rounded-2xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{p.name}</h3>
                    <RiskBadge level={p.risk_level} />
                  </div>
                  {p.description && <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{formatMoney(localPrice, cur)}</div>
                  <div className="text-[10px] text-muted-foreground">price</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Mini icon={TrendingUp} label="Daily" value={`+${formatMoney(localDaily, cur)}`} />
                <Mini icon={Clock} label="Circle" value={`${p.duration_days}d`} />
                <Mini icon={ShieldCheck} label="ROI" value={formatMoney(localReturn, cur)} />
              </div>
              <button
                disabled={busy === p.id}
                onClick={() => buy(p)}
                className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy === p.id ? "Processing…" : "Buy now"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 px-2 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-0.5 text-xs font-semibold">{value}</div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: "bg-success/15 text-success border-success/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    high: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${map[level] ?? map.low}`}>{level} risk</span>;
}
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { displayCurrency, convertFromUsd, formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { Clock, TrendingUp, ShieldCheck, X, CheckCircle2 } from "lucide-react";

type Product = {
  id: string; name: string; description: string | null; price: number;
  daily_earning: number; duration_days: number; total_return: number; risk_level: string;
  image_url: string | null; earning_frequency: string;
};

type MyInv = {
  id: string; product_id: string; purchase_price: number; daily_earning: number;
  duration_days: number; total_return: number; earnings_paid_count: number;
  earnings_accrued: number; status: string; end_date: string;
  products: { name: string } | null;
};

export const Route = createFileRoute("/app/market")({
  component: MarketTab,
});

function MarketTab() {
  const { profile, refreshProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [mine, setMine] = useState<MyInv[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!profile) return;
    const [{ data: prods }, { data: invs }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true).order("price"),
      supabase.from("investments")
        .select("id,product_id,purchase_price,daily_earning,duration_days,total_return,earnings_paid_count,earnings_accrued,status,end_date,products(name)")
        .eq("user_id", profile.id),
    ]);
    setProducts((prods as Product[]) ?? []);
    setMine(((invs as unknown as MyInv[]) ?? []));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const ownedIds = useMemo(() => new Set(mine.map((i) => i.product_id)), [mine]);
  const activeMine = mine.filter((i) => i.status === "active");

  if (!profile) return null;
  const cur = displayCurrency(profile.currency);

  const confirmBuy = async () => {
    if (!selected) return;
    if (ownedIds.has(selected.id)) {
      return toast.error("You already own this product");
    }
    const localPrice = convertFromUsd(selected.price, cur);
    if (profile.balance < localPrice) {
      setSelected(null);
      return toast.error(`Insufficient balance. Need ${formatMoney(localPrice, cur)}`);
    }
    setBusy(true);
    const localDaily = convertFromUsd(selected.daily_earning, cur);
    const localReturn = convertFromUsd(selected.total_return, cur);
    const end = new Date(Date.now() + selected.duration_days * 86400000).toISOString();

    const { error: invErr } = await supabase.from("investments").insert({
      user_id: profile.id,
      product_id: selected.id,
      purchase_price: localPrice,
      daily_earning: localDaily,
      duration_days: selected.duration_days,
      total_return: localReturn,
      end_date: end,
    });
    if (invErr) { setBusy(false); return toast.error(invErr.message); }

    await supabase.from("transactions").insert({
      user_id: profile.id, type: "buy", amount: localPrice, currency: cur,
      status: "completed",
      description: `Purchased ${selected.name}`,
    });
    await supabase.from("profiles").update({ balance: profile.balance - localPrice }).eq("id", profile.id);
    await refreshProfile();
    await load();
    setBusy(false);
    setSelected(null);
    toast.success(`${selected.name} added — daily earnings start tomorrow`);
  };

  return (
    <div className="px-5 pt-6 pb-6">
      <h1 className="text-xl font-bold">Market</h1>
      <p className="mt-1 text-xs text-muted-foreground">Tap a product for details. Daily earnings credit automatically.</p>

      {/* My products */}
      {activeMine.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">My products · circling</h2>
          <div className="space-y-2">
            {activeMine.map((inv) => {
              const pct = Math.min(100, (inv.earnings_paid_count / inv.duration_days) * 100);
              const daysLeft = Math.max(0, inv.duration_days - inv.earnings_paid_count);
              return (
                <div key={inv.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{inv.products?.name ?? "Investment"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {inv.earnings_paid_count}/{inv.duration_days} days · {daysLeft} left
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success">+{formatMoney(inv.daily_earning, cur)}/day</div>
                      <div className="text-[10px] text-muted-foreground">earned {formatMoney(inv.earnings_accrued, cur)}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Available products</h2>
        <div className="space-y-3">
          {products.map((p) => {
            const localPrice = convertFromUsd(p.price, cur);
            const localDaily = convertFromUsd(p.daily_earning, cur);
            const localReturn = convertFromUsd(p.total_return, cur);
            const owned = ownedIds.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => !owned && setSelected(p)}
                disabled={owned}
                className="block w-full rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
                style={{ background: "var(--gradient-card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{p.name}</h3>
                      <RiskBadge level={p.risk_level} />
                      {owned && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">Owned</span>}
                    </div>
                    {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatMoney(localPrice, cur)}</div>
                    <div className="text-[10px] text-muted-foreground">price</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Mini icon={TrendingUp} label="Daily" value={`+${formatMoney(localDaily, cur)}`} />
                  <Mini icon={Clock} label="Cycle" value={`${p.duration_days}d`} />
                  <Mini icon={ShieldCheck} label="ROI" value={formatMoney(localReturn, cur)} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <ProductDialog
          product={selected}
          cur={cur}
          busy={busy}
          onClose={() => setSelected(null)}
          onConfirm={confirmBuy}
        />
      )}
    </div>
  );
}

function ProductDialog({
  product, cur, busy, onClose, onConfirm,
}: { product: Product; cur: string; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const localPrice = convertFromUsd(product.price, cur);
  const localDaily = convertFromUsd(product.daily_earning, cur);
  const localReturn = convertFromUsd(product.total_return, cur);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">{product.name}</h3>
            <RiskBadge level={product.risk_level} />
          </div>
          <button onClick={onClose} className="rounded-full border border-border p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {product.description && <p className="text-xs text-muted-foreground">{product.description}</p>}

        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-background/40 p-3 text-sm">
          <Row label="Price" value={formatMoney(localPrice, cur)} />
          <Row label="Daily earning" value={`+${formatMoney(localDaily, cur)}`} accent />
          <Row label="Cycle" value={`${product.duration_days} days`} />
          <Row label="Total return" value={formatMoney(localReturn, cur)} accent />
        </div>

        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-[11px] text-muted-foreground">
          You can only purchase this product once. Daily earnings credit your wallet automatically each day and are available for withdrawal.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Processing…" : (<><CheckCircle2 className="h-4 w-4" /> Confirm purchase</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${accent ? "text-success" : ""}`}>{value}</span>
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
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${map[level] ?? map.low}`}>{level} risk</span>;
}

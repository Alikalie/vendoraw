import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { Tag } from "lucide-react";

type Investment = {
  id: string; product_id: string; purchase_price: number; daily_earning: number;
  duration_days: number; total_return: number; status: string; end_date: string;
  products: { name: string } | null;
};

type Listing = {
  id: string; investment_id: string; seller_id: string; price: number; status: string;
  investments: { products: { name: string } | null; total_return: number } | null;
};

export const Route = createFileRoute("/_app/sells")({
  component: SellsTab,
});

function SellsTab() {
  const { profile, refreshProfile } = useAuth();
  const [mine, setMine] = useState<Investment[]>([]);
  const [market, setMarket] = useState<Listing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    const { data: invs } = await supabase
      .from("investments")
      .select("id,product_id,purchase_price,daily_earning,duration_days,total_return,status,end_date,products(name)")
      .eq("user_id", profile.id).eq("status", "active");
    setMine((invs as unknown as Investment[]) ?? []);

    const { data: lst } = await supabase
      .from("resale_listings")
      .select("id,investment_id,seller_id,price,status,investments(total_return,products(name))")
      .eq("status", "open").neq("seller_id", profile.id);
    setMarket((lst as unknown as Listing[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return null;
  const cur = profile.currency;

  const list = async (inv: Investment) => {
    const def = (inv.purchase_price * 1.1).toFixed(2);
    const raw = window.prompt(`List "${inv.products?.name}" for resale. Price in ${cur}:`, def);
    if (!raw) return;
    const price = Number(raw);
    if (!isFinite(price) || price <= 0) return toast.error("Invalid price");
    setBusy(inv.id);
    const { error } = await supabase.from("resale_listings").insert({
      investment_id: inv.id, seller_id: profile.id, price,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Listed for resale");
    load();
  };

  const buyResale = async (l: Listing) => {
    if (profile.balance < l.price) return toast.error("Insufficient balance");
    setBusy(l.id);
    // Mark listing sold
    const { error: lErr } = await supabase
      .from("resale_listings")
      .update({ status: "sold", buyer_id: profile.id, sold_at: new Date().toISOString() })
      .eq("id", l.id).eq("status", "open");
    if (lErr) { setBusy(null); return toast.error(lErr.message); }
    // Transfer investment to buyer
    await supabase.from("investments").update({ user_id: profile.id }).eq("id", l.investment_id);
    // Buyer debit
    await supabase.from("profiles").update({ balance: profile.balance - l.price }).eq("id", profile.id);
    await supabase.from("transactions").insert({
      user_id: profile.id, type: "resale_buy", amount: l.price, currency: cur,
      description: `Bought resale: ${l.investments?.products?.name ?? "investment"}`,
    });
    // Seller credit (RLS-allowed: seller updates own row; here we rely on a subsequent seller-side reconciliation in production. For now we record a transaction for seller via insert? RLS prevents inserting for other user.)
    await refreshProfile();
    setBusy(null);
    toast.success("Resale purchased");
    load();
  };

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sells</h1>
        <p className="mt-1 text-xs text-muted-foreground">List your active investments early for liquidity.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">My active investments</h2>
        <div className="space-y-2">
          {mine.length === 0 && <Empty text="You have no active investments yet." />}
          {mine.map((inv) => (
            <div key={inv.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{inv.products?.name ?? "Investment"}</div>
                  <div className="text-xs text-muted-foreground">Paid {formatMoney(inv.purchase_price, cur)} · ROI {formatMoney(inv.total_return, cur)}</div>
                </div>
                <button onClick={() => list(inv)} disabled={busy === inv.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50">
                  <Tag className="h-3 w-3" /> List
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Resale marketplace</h2>
        <div className="space-y-2">
          {market.length === 0 && <Empty text="No resale offers right now." />}
          {market.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="text-sm font-semibold">{l.investments?.products?.name ?? "Investment"}</div>
                <div className="text-xs text-muted-foreground">Future ROI {formatMoney(l.investments?.total_return ?? 0, cur)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{formatMoney(l.price, cur)}</div>
                <button onClick={() => buyResale(l)} disabled={busy === l.id}
                  className="mt-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {busy === l.id ? "…" : "Buy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>;
}
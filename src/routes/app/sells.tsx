import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { buyResaleListing, cancelResaleListing } from "@/server/resale";
import { callAuthed } from "@/lib/server-call";

type Investment = {
  id: string;
  product_id: string;
  purchase_price: number;
  daily_earning: number;
  duration_days: number;
  total_return: number;
  status: string;
  end_date: string;
  products: { name: string } | null;
};

type Listing = {
  id: string;
  investment_id: string;
  seller_id: string;
  price: number;
  status: string;
  investments: { products: { name: string } | null; total_return: number } | null;
};

type MyListing = {
  id: string;
  investment_id: string;
  price: number;
  status: string;
  created_at: string;
  sold_at: string | null;
  investments: { products: { name: string } | null } | null;
};

export const Route = createFileRoute("/app/sells")({
  component: SellsTab,
});

function SellsTab() {
  const { profile, refreshProfile } = useAuth();
  const [mine, setMine] = useState<Investment[]>([]);
  const [market, setMarket] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    // Investments owned by user that are not currently listed for resale
    const { data: openListings } = await supabase
      .from("resale_listings")
      .select("investment_id")
      .eq("seller_id", profile.id)
      .eq("status", "open");
    const lockedIds = new Set((openListings ?? []).map((l) => l.investment_id));

    const { data: invs } = await supabase
      .from("investments")
      .select(
        "id,product_id,purchase_price,daily_earning,duration_days,total_return,status,end_date,products(name)",
      )
      .eq("user_id", profile.id)
      .eq("status", "active");
    setMine(((invs as unknown as Investment[]) ?? []).filter((i) => !lockedIds.has(i.id)));

    const { data: lst } = await supabase
      .from("resale_listings")
      .select("id,investment_id,seller_id,price,status,investments(total_return,products(name))")
      .eq("status", "open")
      .neq("seller_id", profile.id);
    setMarket((lst as unknown as Listing[]) ?? []);

    const { data: mineLst } = await supabase
      .from("resale_listings")
      .select("id,investment_id,price,status,created_at,sold_at,investments(products(name))")
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setMyListings((mineLst as unknown as MyListing[]) ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [profile?.id]);

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
      investment_id: inv.id,
      seller_id: profile.id,
      price,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Listed for resale");
    load();
  };

  const buyResale = async (l: Listing) => {
    if (profile.balance < l.price) return toast.error("Insufficient balance");
    setBusy(l.id);
    try {
      await callAuthed(buyResaleListing, { listingId: l.id });
      toast.success("Resale purchased");
      await refreshProfile();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  };

  const cancelListing = async (id: string) => {
    if (!confirm("Cancel this listing?")) return;
    setBusy(id);
    try {
      await callAuthed(cancelResaleListing, { listingId: id });
      toast.success("Listing cancelled");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Sells</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          List your active investments early for liquidity.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">My active investments</h2>
        <div className="space-y-2">
          {mine.length === 0 && <Empty text="No investments available to list." />}
          {mine.map((inv) => (
            <div key={inv.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{inv.products?.name ?? "Investment"}</div>
                  <div className="text-xs text-muted-foreground">
                    Paid {formatMoney(inv.purchase_price, cur)} · ROI{" "}
                    {formatMoney(inv.total_return, cur)}
                  </div>
                </div>
                <button
                  onClick={() => list(inv)}
                  disabled={busy === inv.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  <Tag className="h-3 w-3" /> List
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">My listings</h2>
        <div className="space-y-2">
          {myListings.length === 0 && <Empty text="You have no resale listings." />}
          {myListings.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {l.investments?.products?.name ?? "Investment"}
                </div>
                <div className="text-[11px] text-muted-foreground capitalize">
                  {l.status}
                  {l.sold_at ? ` · ${new Date(l.sold_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold">{formatMoney(l.price, cur)}</div>
                {l.status === "open" && (
                  <button
                    onClick={() => cancelListing(l.id)}
                    disabled={busy === l.id}
                    title="Cancel listing"
                    className="rounded-full border border-border p-1.5 hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
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
            <div
              key={l.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <div className="text-sm font-semibold">
                  {l.investments?.products?.name ?? "Investment"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Future ROI {formatMoney(l.investments?.total_return ?? 0, cur)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{formatMoney(l.price, cur)}</div>
                <button
                  onClick={() => buyResale(l)}
                  disabled={busy === l.id}
                  className="mt-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
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
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { ArrowDownToLine, ArrowUpFromLine, ShoppingBag, TrendingUp, Users, Tag } from "lucide-react";

type Tx = { id: string; type: string; amount: number; currency: string; status: string; description: string | null; created_at: string };

export const Route = createFileRoute("/_app/transactions")({
  component: TxTab,
});

const tabs = ["all", "deposit", "withdraw", "buy", "earning"] as const;
type TabId = (typeof tabs)[number];

const iconFor: Record<string, typeof ArrowDownToLine> = {
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  buy: ShoppingBag,
  earning: TrendingUp,
  referral: Users,
  resale_buy: Tag,
  resale_sell: Tag,
};

function TxTab() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Tx[]>([]);
  const [tab, setTab] = useState<TabId>("all");

  useEffect(() => {
    if (!profile) return;
    supabase.from("transactions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setItems((data as Tx[]) ?? []));
  }, [profile]);

  const filtered = tab === "all" ? items : items.filter((i) => i.type === tab);

  return (
    <div className="px-5 pt-6 pb-6">
      <h1 className="text-xl font-bold">Activity</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No transactions yet.
          </div>
        )}
        {filtered.map((tx) => {
          const Icon = iconFor[tx.type] ?? TrendingUp;
          const isCredit = tx.type === "deposit" || tx.type === "earning" || tx.type === "referral" || tx.type === "resale_sell";
          return (
            <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isCredit ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold capitalize">{tx.type.replace("_", " ")}</div>
                <div className="truncate text-xs text-muted-foreground">{tx.description ?? new Date(tx.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${isCredit ? "text-success" : ""}`}>
                  {isCredit ? "+" : "-"}{formatMoney(tx.amount, tx.currency)}
                </div>
                <div className="text-[10px] capitalize text-muted-foreground">{tx.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
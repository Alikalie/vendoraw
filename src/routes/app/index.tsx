import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/data/countries";
import { ArrowDownToLine, ArrowUpFromLine, Bell, TrendingUp, Wallet, Activity } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: HomeTab,
});

function HomeTab() {
  const { profile } = useAuth();
  const [activeCount, setActiveCount] = useState(0);
  const [trending, setTrending] = useState<{ id: string; name: string; daily_earning: number; total_return: number; price: number }[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("investments").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "active")
      .then(({ count }) => setActiveCount(count ?? 0));
    supabase.from("products").select("id,name,daily_earning,total_return,price").eq("active", true).limit(3)
      .then(({ data }) => setTrending(data ?? []));
  }, [profile]);

  if (!profile) return null;
  const cur = profile.currency;

  return (
    <div className="px-5 pt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-xl font-bold">{profile.first_name} 👋</h1>
        </div>
        <button className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
      </div>

      {/* Balance hero */}
      <div className="rounded-3xl p-5 text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Wallet className="h-3.5 w-3.5" /> Account balance
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">{formatMoney(profile.balance, cur)}</div>
        <div className="mt-1 text-xs opacity-80">{cur} · {profile.country}</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link to="/app/profile" className="flex items-center justify-center gap-2 rounded-xl bg-primary-foreground/20 py-2.5 text-sm font-semibold backdrop-blur hover:bg-primary-foreground/30">
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/app/profile" className="flex items-center justify-center gap-2 rounded-xl bg-primary-foreground/20 py-2.5 text-sm font-semibold backdrop-blur hover:bg-primary-foreground/30">
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={TrendingUp} label="Earned" value={formatMoney(profile.total_earned, cur)} />
        <Stat icon={Activity} label="Active" value={String(activeCount)} />
        <Stat icon={ArrowUpFromLine} label="Withdrawn" value={formatMoney(profile.total_withdrawn, cur)} />
      </div>

      {/* Trending */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Trending products</h2>
          <Link to="/app/market" className="text-xs text-primary">See all</Link>
        </div>
        <div className="space-y-2">
          {trending.map((p) => (
            <Link key={p.id} to="/app/market" className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">From {formatMoney(p.price, "USD")} · ROI {formatMoney(p.total_return, "USD")}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">+{formatMoney(p.daily_earning, "USD")}</div>
                <div className="text-[10px] text-muted-foreground">per day</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* News */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">News & updates</h2>
        <div className="rounded-2xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
          <div className="text-sm font-semibold">Welcome to Vendora 🎉</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Explore the market, list a resale, or share your referral code from your profile to earn commissions when friends join.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
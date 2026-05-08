import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { formatMoney } from "@/data/countries";
import {
  ShieldCheck, Users, Package, FileText, ArrowDownToLine, ArrowUpFromLine, Crown,
  TrendingUp, Activity, Wallet, Sun, Moon, Settings, BookOpen, RefreshCw, History,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { toast } from "sonner";
import { callAuthed } from "@/lib/server-call";
import { refreshExchangeRates } from "@/server/fx";

export const Route = createFileRoute("/app/admin/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    const isAdmin = list.some((r) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: AdminHome,
});

type Tx = { id: string; type: string; amount: number; status: string; created_at: string };

function AdminHome() {
  const { isSuperAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [stats, setStats] = useState({
    users: 0, deposits: 0, withdrawals: 0, activeInvestments: 0, profit: 0,
    pendingDeposits: 0, pendingWithdrawals: 0,
  });
  const [recent, setRecent] = useState<Tx[]>([]);
  const [refreshingFx, setRefreshingFx] = useState(false);

  const load = async () => {
    const [u, d, w, inv, txs] = await Promise.all([
      supabase.from("profiles").select("id,created_at,balance,total_invested,total_withdrawn"),
      supabase.from("transactions").select("id,type,amount,status,created_at").eq("type", "deposit"),
      supabase.from("transactions").select("id,type,amount,status,created_at").eq("type", "withdraw"),
      supabase.from("investments").select("id,status").eq("status", "active"),
      supabase.from("transactions").select("id,type,amount,status,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    const users = (u.data ?? []).length;
    const dRows = d.data ?? [];
    const wRows = w.data ?? [];
    const completedDeposits = dRows.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0);
    const completedWithdrawals = wRows.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0);
    setStats({
      users,
      deposits: completedDeposits,
      withdrawals: completedWithdrawals,
      activeInvestments: (inv.data ?? []).length,
      profit: completedDeposits - completedWithdrawals,
      pendingDeposits: dRows.filter((r) => r.status === "pending").length,
      pendingWithdrawals: wRows.filter((r) => r.status === "pending").length,
    });
    setRecent((txs.data as Tx[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  // Daily aggregates for charts (last 14 days)
  const dailyData = useMemo(() => {
    const days: { date: string; deposits: number; withdrawals: number }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      days.push({ date: d.toISOString().slice(5, 10), deposits: 0, withdrawals: 0 });
    }
    recent.forEach((r) => {
      const day = new Date(r.created_at).toISOString().slice(5, 10);
      const slot = days.find((x) => x.date === day);
      if (!slot || r.status !== "completed") return;
      if (r.type === "deposit") slot.deposits += Number(r.amount);
      if (r.type === "withdraw") slot.withdrawals += Number(r.amount);
    });
    return days;
  }, [recent]);

  const refreshFx = async () => {
    setRefreshingFx(true);
    try {
      const res = await callAuthed(refreshExchangeRates as unknown as (opts: { data: undefined; headers?: Record<string, string> }) => Promise<Awaited<ReturnType<typeof refreshExchangeRates>>>, undefined);
      if (res.ok) toast.success(`Updated ${res.updated} currencies`);
      else toast.error(res.error ?? "FX refresh failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "FX refresh failed");
    } finally { setRefreshingFx(false); }
  };

  const cards: { to: string; title: string; desc: string; icon: typeof Users; badge?: number }[] = [
    { to: "/app/admin/users", title: "Users", desc: "Search, block, credit, promote", icon: Users },
    { to: "/app/admin/products", title: "Products", desc: "Investment plans (CRUD)", icon: Package },
    { to: "/app/admin/deposits", title: "Deposits", desc: "Approve pending deposits", icon: ArrowDownToLine, badge: stats.pendingDeposits },
    { to: "/app/admin/withdrawals", title: "Withdrawals", desc: "Bulk approve payouts", icon: ArrowUpFromLine, badge: stats.pendingWithdrawals },
    { to: "/app/admin/investments", title: "Investments", desc: "Monitor active positions", icon: Activity },
    { to: "/app/admin/transactions", title: "All transactions", desc: "Full audit of money flows", icon: History },
    { to: "/app/admin/referrals", title: "Affiliates", desc: "Applications, commissions & affiliates", icon: TrendingUp },
    { to: "/app/admin/content", title: "Site content (CMS)", desc: "Help, Privacy & instructions", icon: FileText },
    { to: "/app/admin/settings", title: "Settings", desc: "Bonuses, commissions, FX, fees", icon: Settings },
    { to: "/app/admin/audit", title: "Audit log", desc: "Every admin action recorded", icon: History },
  ];

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Admin dashboard" subtitle="Manage Vendora"
        right={
          <button onClick={toggle} title="Toggle theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        }
      />
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <ShieldCheck className="h-3 w-3" /> Admin console
        </div>
        {isSuperAdmin && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
            <Crown className="h-3 w-3" /> Super-admin
          </div>
        )}
        <button onClick={refreshFx} disabled={refreshingFx}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold hover:bg-card disabled:opacity-50">
          <RefreshCw className={`h-3 w-3 ${refreshingFx ? "animate-spin" : ""}`} /> Refresh FX
        </button>
      </div>

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric icon={Users} label="Total users" value={stats.users.toLocaleString()} />
        <Metric icon={ArrowDownToLine} label="Deposits" value={formatMoney(stats.deposits, "USD")} tone="success" />
        <Metric icon={ArrowUpFromLine} label="Withdrawals" value={formatMoney(stats.withdrawals, "USD")} tone="destructive" />
        <Metric icon={Activity} label="Active invest." value={stats.activeInvestments.toLocaleString()} />
        <Metric icon={Wallet} label="Net flow" value={formatMoney(stats.profit, "USD")} tone={stats.profit >= 0 ? "success" : "destructive"} />
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold">Daily money flow (last 14d)</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="dep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontSize: 11 }} />
                <Area type="monotone" dataKey="deposits" stroke="var(--color-success)" fill="url(#dep)" />
                <Area type="monotone" dataKey="withdrawals" stroke="var(--color-destructive)" fill="url(#wd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold">Volume comparison</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", fontSize: 11 }} />
                <Bar dataKey="deposits" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdrawals" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Nav cards */}
      <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manage</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="group relative rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              {!!c.badge && c.badge > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-background">
                  {c.badge}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.desc}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {isSuperAdmin && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <BookOpen className="h-5 w-5 text-warning" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Audit log</div>
            <div className="text-[11px] text-muted-foreground">Every admin action recorded — view coming next iteration</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "primary" }:
  { icon: typeof Users; label: string; value: string; tone?: "primary" | "success" | "destructive" }) {
  const toneCls = tone === "success"
    ? "text-success border-success/30 bg-success/5"
    : tone === "destructive"
    ? "text-destructive border-destructive/30 bg-destructive/5"
    : "text-primary border-primary/30 bg-primary/5";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-bold truncate">{value}</div>
    </div>
  );
}
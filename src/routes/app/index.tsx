import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/data/countries";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  TrendingUp,
  Wallet,
  Activity,
  Newspaper,
  X,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: HomeTab,
});

function HomeTab() {
  const { profile } = useAuth();
  const [activeCount, setActiveCount] = useState(0);
  const [trending, setTrending] = useState<
    { id: string; name: string; daily_earning: number; total_return: number; price: number }[]
  >([]);
  const [news, setNews] = useState<
    { id: string; title: string; body: string; image_url: string | null; created_at: string }[]
  >([]);
  const [notifs, setNotifs] = useState<
    {
      id: string;
      title: string;
      body: string;
      kind: string;
      read_at: string | null;
      created_at: string;
    }[]
  >([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("investments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "active")
      .then(({ count }) => setActiveCount(count ?? 0));
    supabase
      .from("products")
      .select("id,name,daily_earning,total_return,price")
      .eq("active", true)
      .limit(3)
      .then(({ data }) => setTrending(data ?? []));
    supabase
      .from("news_posts" as never)
      .select("id,title,body,image_url,created_at")
      .eq("published", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setNews((data as typeof news) ?? []));
    const loadNotifs = () => {
      supabase
        .from("notifications" as never)
        .select("id,title,body,kind,read_at,created_at")
        .or(`user_id.eq.${profile.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => setNotifs((data as typeof notifs) ?? []));
    };
    loadNotifs();
    const ch = supabase
      .channel(`notifs-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadNotifs)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [profile]);

  const unreadCount = notifs.filter((n) => !n.read_at).length;
  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from("notifications" as never)
      .update({ read_at: new Date().toISOString() } as never)
      .eq("user_id", profile.id)
      .is("read_at", null);
    setNotifs((p) => p.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

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
        <button
          onClick={() => setShowNotifs(true)}
          className="relative rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Balance hero */}
      <div
        className="rounded-3xl p-5 text-primary-foreground shadow-[var(--shadow-glow)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Wallet className="h-3.5 w-3.5" /> Account balance
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight">
          {formatMoney(profile.balance, cur)}
        </div>
        <div className="mt-1 text-xs opacity-80">
          {cur} · {profile.country}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            to="/app/profile"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-foreground/20 py-2.5 text-sm font-semibold backdrop-blur hover:bg-primary-foreground/30"
          >
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </Link>
          <Link
            to="/app/profile"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-foreground/20 py-2.5 text-sm font-semibold backdrop-blur hover:bg-primary-foreground/30"
          >
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={TrendingUp} label="Earned" value={formatMoney(profile.total_earned, cur)} />
        <Stat icon={Activity} label="Active" value={String(activeCount)} />
        <Stat
          icon={ArrowUpFromLine}
          label="Withdrawn"
          value={formatMoney(profile.total_withdrawn, cur)}
        />
      </div>

      {/* Trending */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Trending products</h2>
          <Link to="/app/market" className="text-xs text-primary">
            See all
          </Link>
        </div>
        <div className="space-y-2">
          {trending.map((p) => (
            <Link
              key={p.id}
              to="/app/market"
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/40"
            >
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  From {formatMoney(p.price, "USD")} · ROI {formatMoney(p.total_return, "USD")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">
                  +{formatMoney(p.daily_earning, "USD")}
                </div>
                <div className="text-[10px] text-muted-foreground">per day</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* News */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">News & updates</h2>
        </div>
        <div className="space-y-2">
          {news.length === 0 && (
            <div
              className="rounded-2xl border border-border p-4"
              style={{ background: "var(--gradient-card)" }}
            >
              <div className="text-sm font-semibold">Welcome to Vendora 🎉</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Explore the market and start earning daily.
              </p>
            </div>
          )}
          {news.map((n) => (
            <article
              key={n.id}
              className="rounded-2xl border border-border overflow-hidden"
              style={{ background: "var(--gradient-card)" }}
            >
              {n.image_url && (
                <img src={n.image_url} alt={n.title} className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="text-sm font-semibold">{n.title}</div>
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString()}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showNotifs && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setShowNotifs(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifs(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {notifs.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No notifications yet
                </p>
              )}
              {notifs.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 ${n.read_at ? "border-border bg-background/30" : "border-primary/40 bg-primary/5"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">{n.title}</div>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

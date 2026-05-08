import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/data/countries";
import { toast } from "sonner";
import {
  ArrowDownToLine, ArrowUpFromLine, Tag, Copy, LogOut,
  LifeBuoy, FileText, Wallet, Lock, Sun, Moon, ShieldCheck,
} from "lucide-react";
import { WithdrawalMethodsManager } from "@/components/app/WithdrawalMethods";
import { WithdrawDialog } from "@/components/app/WithdrawDialog";

export const Route = createFileRoute("/app/profile")({
  component: ProfileTab,
});

function ProfileTab() {
  const { profile, refreshProfile, signOut, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [showMethods, setShowMethods] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [history, setHistory] = useState<{ id: string; amount: number; currency: string; status: string; description: string | null; created_at: string }[]>([]);

  const loadHistory = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("transactions")
      .select("id,amount,currency,status,description,created_at")
      .eq("user_id", profile.id)
      .eq("type", "withdraw")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory(data ?? []);
  };
  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return null;
  const cur = profile.currency;

  const onWithdrawDone = async () => {
    await refreshProfile();
    await loadHistory();
  };

  const copy = async (val: string, label: string) => {
    await navigator.clipboard.writeText(val);
    toast.success(`${label} copied`);
  };

  const doSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav({ to: "/" });
  };

  const currencyUnlockDate = new Date(profile.currency_locked_until);
  const currencyUnlocked = currencyUnlockDate.getTime() < Date.now();

  return (
    <div className="px-5 pt-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          {profile.first_name[0]}{profile.last_name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold truncate">{profile.first_name} {profile.last_name}</div>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" /> ADMIN
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <button onClick={() => copy(profile.id, "Account ID")} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
              ID: {profile.id.slice(0, 8)}… <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Wallet stats: Invested / Earned / Withdrawn */}
      <div className="rounded-2xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Available balance</div>
        <div className="mt-1 text-3xl font-bold">{formatMoney(profile.balance, cur)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Invested" value={formatMoney(profile.total_invested, cur)} />
          <Stat label="Earned" value={formatMoney(profile.total_earned, cur)} />
          <Stat label="Withdrawn" value={formatMoney(profile.total_withdrawn, cur)} />
        </div>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/app/deposit" className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-xs font-semibold text-primary-foreground hover:opacity-90">
          <ArrowDownToLine className="h-4 w-4" /> Deposit
        </Link>
        <button onClick={() => setShowWithdraw(true)} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-3 text-xs font-semibold hover:bg-background/40">
          <ArrowUpFromLine className="h-4 w-4" /> Withdraw
        </button>
        <Link to="/app/sells" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-3 text-xs font-semibold hover:bg-background/40">
          <Tag className="h-4 w-4" /> Sell product
        </Link>
      </div>

      {/* Personal info — locked unless admin grants permission */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Personal information</h2>
          {profile.profile_locked && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Locked — contact support to edit
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          <InfoRow label="First name" value={profile.first_name} />
          <InfoRow label="Last name" value={profile.last_name} />
          <InfoRow label="Country" value={profile.country} />
          <InfoRow label="Phone" value={profile.contact ?? "—"} />
          <InfoRow
            label="Currency"
            value={profile.currency}
            hint={currencyUnlocked ? "Unlocked" : `Locked until ${currencyUnlockDate.toLocaleDateString()}`}
          />
        </div>
      </section>

      {/* Settings menu */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {isAdmin && (
          <>
            <Link to="/app/admin" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Admin dashboard</span>
              </div>
              <span className="text-[11px] text-primary">Open</span>
            </Link>
            <Link to="/app/admin/deposits" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm">Admin · Deposit approvals</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Open</span>
            </Link>
            <Link to="/app/admin/withdrawals" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm">Admin · Withdrawal queue</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Open</span>
            </Link>
          </>
        )}
        <button onClick={() => setShowMethods(true)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
          <div className="flex items-center gap-3">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Linked accounts (Mobile / Bank / PayPal)</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Manage</span>
        </button>
        <button onClick={toggle} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm">Theme</span>
          </div>
          <span className="text-[11px] text-muted-foreground capitalize">{theme} · tap to switch</span>
        </button>
        <Link to="/app/support" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Help & Support</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Read</span>
        </Link>
        <Link to="/app/privacy" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Privacy & Terms</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Read</span>
        </Link>
      </div>

      {/* Affiliate program */}
      <Link to="/app/affiliate" className="block rounded-2xl border border-border p-4 bg-card hover:bg-background/40 transition-colors">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Affiliate program</div>
            {profile.referral_code ? (
              <div className="mt-1 flex items-center gap-2">
                <code className="text-lg font-bold tracking-wider text-primary">{profile.referral_code}</code>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Approved</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Complete 10 investments to apply for a promo code and earn commissions.
              </p>
            )}
          </div>
          <span className="text-[11px] text-primary">Open →</span>
        </div>
      </Link>

      {/* Withdrawal history */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Withdrawal history</h2>
          <Link to="/app/withdrawals" className="text-[11px] text-primary hover:underline">View all</Link>
        </div>
        <div className="space-y-2">
          {history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              No withdrawals yet.
            </div>
          )}
          {history.map((h) => (
            <Link key={h.id} to="/app/transactions/$txId" params={{ txId: h.id }} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 hover:bg-background/40">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{h.description ?? "Withdrawal"}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">-{formatMoney(h.amount, h.currency)}</div>
                <div className={`text-[10px] capitalize ${h.status === "completed" ? "text-success" : h.status === "pending" ? "text-warning" : "text-destructive"}`}>
                  {h.status}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <button onClick={doSignOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      {showMethods && <WithdrawalMethodsManager onClose={() => setShowMethods(false)} />}
      {showWithdraw && <WithdrawDialog onClose={() => setShowWithdraw(false)} onDone={onWithdrawDone} onManageMethods={() => setShowMethods(true)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/30 p-2.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className="text-sm font-medium truncate max-w-[200px]" title={value}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

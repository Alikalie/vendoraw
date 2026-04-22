import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Copy, LogOut, ShieldAlert, LifeBuoy, FileText, Wallet } from "lucide-react";
import { WithdrawalMethodsManager } from "@/components/app/WithdrawalMethods";
import { WithdrawDialog } from "@/components/app/WithdrawDialog";

export const Route = createFileRoute("/app/profile")({
  component: ProfileTab,
});

function ProfileTab() {
  const { profile, refreshProfile, signOut } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
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

  const deposit = async () => {
    const raw = window.prompt(`Deposit amount in ${cur}:`, "100");
    if (!raw) return;
    const amt = Number(raw);
    if (!isFinite(amt) || amt <= 0) return toast.error("Invalid amount");
    setBusy(true);
    await supabase.from("profiles").update({ balance: profile.balance + amt }).eq("id", profile.id);
    await supabase.from("transactions").insert({
      user_id: profile.id, type: "deposit", amount: amt, currency: cur, description: "Wallet deposit (simulated)",
    });
    await refreshProfile();
    setBusy(false);
    toast.success(`Deposited ${formatMoney(amt, cur)}`);
  };

  const onWithdrawDone = async () => {
    await refreshProfile();
    await loadHistory();
  };

  const copyRef = async () => {
    await navigator.clipboard.writeText(profile.referral_code);
    toast.success("Referral code copied");
  };

  const doSignOut = async () => {
    await signOut();
    nav({ to: "/" });
  };

  return (
    <div className="px-5 pt-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          {profile.first_name[0]}{profile.last_name[0]}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">{profile.first_name} {profile.last_name}</div>
          <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
          <div className="text-[11px] text-muted-foreground">{profile.country} · {cur}</div>
        </div>
      </div>

      {/* Wallet summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Balance" value={formatMoney(profile.balance, cur)} />
        <Stat label="Earned" value={formatMoney(profile.total_earned, cur)} />
        <Stat label="Withdrawn" value={formatMoney(profile.total_withdrawn, cur)} />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button disabled={busy} onClick={deposit} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <ArrowDownToLine className="h-4 w-4" /> Deposit
        </button>
        <button onClick={() => setShowWithdraw(true)} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-card">
          <ArrowUpFromLine className="h-4 w-4" /> Withdraw
        </button>
      </div>

      {/* Referral */}
      <div className="rounded-2xl border border-border p-4" style={{ background: "var(--gradient-card)" }}>
        <div className="text-xs text-muted-foreground">Your referral code</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <code className="text-lg font-bold tracking-wider text-primary">{profile.referral_code}</code>
          <button onClick={copyRef} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-background/40">
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Friends who sign up with your code receive a $5 bonus and you earn referral commissions.
        </p>
      </div>

      {/* Menu */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        <button onClick={() => setShowMethods(true)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
          <div className="flex items-center gap-3">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Withdrawal methods</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Manage</span>
        </button>
        <Row icon={LifeBuoy} label="Contact support" hint="support@vendora.app" />
        <Row icon={FileText} label="Privacy & terms" />
      </div>

      {/* Withdrawal history */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Withdrawal history</h2>
          <span className="text-[11px] text-muted-foreground">Last 10</span>
        </div>
        <div className="space-y-2">
          {history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              No withdrawals yet.
            </div>
          )}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{h.description ?? "Withdrawal"}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">-{formatMoney(h.amount, h.currency)}</div>
                <div className={`text-[10px] capitalize ${h.status === "completed" ? "text-success" : h.status === "pending" ? "text-warning" : "text-muted-foreground"}`}>
                  {h.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="flex gap-2 rounded-2xl border border-warning/40 bg-warning/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        <span>Vendora is an educational simulation. No real money is moved. Returns shown are not guaranteed.</span>
      </div>

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
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function Row({ icon: Icon, label, hint }: { icon: typeof Wallet; label: string; hint?: string }) {
  return (
    <button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-background/30">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </button>
  );
}
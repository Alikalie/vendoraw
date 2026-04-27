import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { formatMoney } from "@/data/countries";
import {
  Search, ShieldCheck, ShieldOff, Crown, Plus, Minus, Lock, Unlock, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/users")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: AdminUsers,
});

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  contact: string | null;
  country: string;
  currency: string;
  balance: number;
  total_invested: number;
  total_withdrawn: number;
  is_blocked: boolean;
  profile_locked: boolean;
  created_at: string;
};

type RoleRow = { user_id: string; role: string };

function AdminUsers() {
  const { isSuperAdmin, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [creditDialog, setCreditDialog] = useState<Row | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles")
      .select("id,first_name,last_name,email,contact,country,currency,balance,total_invested,total_withdrawn,is_blocked,profile_locked,created_at")
      .order("created_at", { ascending: false }).limit(500);
    setRows((data as Row[]) ?? []);
    const { data: r } = await supabase.from("user_roles").select("user_id,role");
    setRoles((r as RoleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(term) ||
      (r.email ?? "").toLowerCase().includes(term) ||
      (r.contact ?? "").toLowerCase().includes(term) ||
      r.id.includes(term),
    );
  }, [q, rows]);

  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  const setBlocked = async (u: Row, blocked: boolean) => {
    setBusy(u.id);
    const { error } = await supabase.from("profiles").update({ is_blocked: blocked }).eq("id", u.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(blocked ? "User blocked" : "User unblocked");
    setRows((p) => p.map((x) => x.id === u.id ? { ...x, is_blocked: blocked } : x));
  };

  const setProfileLocked = async (u: Row, locked: boolean) => {
    setBusy(u.id);
    const { error } = await supabase.from("profiles").update({ profile_locked: locked }).eq("id", u.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(locked ? "Profile locked" : "Profile unlocked for editing");
    setRows((p) => p.map((x) => x.id === u.id ? { ...x, profile_locked: locked } : x));
  };

  const promote = async (u: Row, role: "admin" | "super_admin") => {
    if (!isSuperAdmin) return toast.error("Only super-admin can change roles");
    setBusy(u.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Granted ${role}`);
    setRoles((p) => [...p, { user_id: u.id, role }]);
  };

  const revoke = async (u: Row, role: string) => {
    if (!isSuperAdmin) return toast.error("Only super-admin can change roles");
    if (role === "super_admin" && u.id === user?.id) return toast.error("You cannot revoke your own super-admin");
    setBusy(u.id);
    const { error } = await supabase.from("user_roles")
      .delete().eq("user_id", u.id).eq("role", role as "admin" | "super_admin" | "user");
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Revoked ${role}`);
    setRoles((p) => p.filter((r) => !(r.user_id === u.id && r.role === role)));
  };

  const submitCredit = async () => {
    if (!creditDialog) return;
    const amt = Number(creditAmount);
    if (!isFinite(amt) || amt === 0) return toast.error("Enter a non-zero amount");
    const u = creditDialog;
    const newBal = Number(u.balance) + amt;
    if (newBal < 0) return toast.error("Balance would go negative");
    setBusy(u.id);
    const { error } = await supabase.from("profiles").update({ balance: newBal }).eq("id", u.id);
    if (!error) {
      await supabase.from("transactions").insert({
        user_id: u.id, type: amt > 0 ? "deposit" : "withdraw",
        amount: Math.abs(amt), currency: u.currency, status: "completed",
        description: `Manual ${amt > 0 ? "credit" : "debit"} by admin`,
      });
    }
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Adjusted balance by ${formatMoney(amt, u.currency)}`);
    setRows((p) => p.map((x) => x.id === u.id ? { ...x, balance: newBal } : x));
    setCreditDialog(null);
    setCreditAmount("");
  };

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Users" subtitle={`${rows.length} accounts`} fallbackTo="/app/admin" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, ID…"
          className="w-full rounded-xl border border-border bg-background/30 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No users match.
          </div>
        )}
        {filtered.map((u) => {
          const ur = rolesFor(u.id);
          const isAdmin = ur.includes("admin") || ur.includes("super_admin");
          const isSuper = ur.includes("super_admin");
          return (
            <article key={u.id} className="rounded-2xl border border-border bg-card p-4">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">{u.first_name} {u.last_name}</span>
                    {isSuper && <Badge tone="warning" icon={<Crown className="h-2.5 w-2.5" />}>Super</Badge>}
                    {isAdmin && !isSuper && <Badge tone="primary" icon={<ShieldCheck className="h-2.5 w-2.5" />}>Admin</Badge>}
                    {u.is_blocked && <Badge tone="destructive">Blocked</Badge>}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{u.email ?? "—"} · {u.country} · {u.currency}</div>
                  <div className="truncate text-[10px] text-muted-foreground">ID: {u.id.slice(0, 8)}…</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatMoney(Number(u.balance), u.currency)}</div>
                  <div className="text-[10px] text-muted-foreground">balance</div>
                </div>
              </header>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground sm:grid-cols-3">
                <Stat label="Invested" value={formatMoney(Number(u.total_invested), u.currency)} />
                <Stat label="Withdrawn" value={formatMoney(Number(u.total_withdrawn), u.currency)} />
                <Stat label="Joined" value={new Date(u.created_at).toLocaleDateString()} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button disabled={busy === u.id} onClick={() => setCreditDialog(u)}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-50">
                  <Plus className="h-3 w-3" /> Adjust balance
                </button>
                <button disabled={busy === u.id} onClick={() => setBlocked(u, !u.is_blocked)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${
                    u.is_blocked ? "border-success/40 text-success hover:bg-success/10" : "border-destructive/40 text-destructive hover:bg-destructive/10"
                  }`}>
                  {u.is_blocked ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                  {u.is_blocked ? "Unblock" : "Block"}
                </button>
                <button disabled={busy === u.id} onClick={() => setProfileLocked(u, !u.profile_locked)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-background/40 disabled:opacity-50">
                  {u.profile_locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {u.profile_locked ? "Unlock profile" : "Lock profile"}
                </button>
                {isSuperAdmin && (
                  <>
                    {!isAdmin && (
                      <button disabled={busy === u.id} onClick={() => promote(u, "admin")}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">
                        <ShieldCheck className="h-3 w-3" /> Make admin
                      </button>
                    )}
                    {isAdmin && !isSuper && (
                      <>
                        <button disabled={busy === u.id} onClick={() => promote(u, "super_admin")}
                          className="inline-flex items-center gap-1 rounded-md border border-warning/40 px-2 py-1 text-[10px] font-semibold text-warning hover:bg-warning/10 disabled:opacity-50">
                          <Crown className="h-3 w-3" /> Make super
                        </button>
                        <button disabled={busy === u.id} onClick={() => revoke(u, "admin")}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                          <Minus className="h-3 w-3" /> Revoke admin
                        </button>
                      </>
                    )}
                    {isSuper && u.id !== user?.id && (
                      <button disabled={busy === u.id} onClick={() => revoke(u, "super_admin")}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                        <Minus className="h-3 w-3" /> Revoke super
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {creditDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setCreditDialog(null)}>
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold">Adjust balance</h3>
                <p className="text-xs text-muted-foreground">{creditDialog.first_name} {creditDialog.last_name} · current {formatMoney(Number(creditDialog.balance), creditDialog.currency)}</p>
              </div>
              <button onClick={() => setCreditDialog(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-4 block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Amount ({creditDialog.currency})</span>
              <input type="number" inputMode="decimal" value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)} placeholder="Positive to credit, negative to debit"
                className="mt-1 w-full rounded-xl border border-border bg-background/30 px-3 py-2.5 text-base outline-none focus:border-primary" />
            </label>
            <p className="mt-2 text-[11px] text-muted-foreground">Logged as a completed transaction. Use a negative number to debit.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setCreditDialog(null)} className="rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-background/40">Cancel</button>
              <button onClick={submitCredit} disabled={busy === creditDialog.id}
                className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Badge({ tone, icon, children }: { tone: "primary" | "warning" | "destructive"; icon?: React.ReactNode; children: React.ReactNode }) {
  const map = {
    primary: "border-primary/30 bg-primary/10 text-primary",
    warning: "border-warning/30 bg-warning/10 text-warning",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${map[tone]}`}>
      {icon}{children}
    </span>
  );
}
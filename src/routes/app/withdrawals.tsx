import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { ArrowUpFromLine, Clock, CheckCircle2, XCircle, ShieldCheck, Plus } from "lucide-react";
import { WithdrawDialog } from "@/components/app/WithdrawDialog";
import { WithdrawalMethodsManager } from "@/components/app/WithdrawalMethods";

export const Route = createFileRoute("/app/withdrawals")({
  component: WithdrawalsTab,
});

type Row = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
};

const statuses = ["all", "pending", "completed", "failed"] as const;
type StatusTab = (typeof statuses)[number];

function statusStyle(s: string) {
  if (s === "completed") return { label: "Completed", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" };
  if (s === "pending") return { label: "Pending", icon: Clock, cls: "bg-warning/15 text-warning border-warning/30" };
  if (s === "failed" || s === "rejected") return { label: "Failed", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" };
  return { label: s, icon: Clock, cls: "bg-muted text-muted-foreground border-border" };
}

function WithdrawalsTab() {
  const { profile, isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<StatusTab>("all");
  const [adminView, setAdminView] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showMethods, setShowMethods] = useState(false);

  const load = async () => {
    if (!profile) return;
    let q = supabase
      .from("transactions")
      .select("id,user_id,amount,currency,status,description,created_at")
      .eq("type", "withdraw")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!(isAdmin && adminView)) q = q.eq("user_id", profile.id);
    const { data } = await q;
    setRows((data as Row[]) ?? []);
  };

  useEffect(() => {
    load();
    if (!profile) return;
    const ch = supabase
      .channel(`tx-withdraw-${profile.id}-${adminView ? "all" : "self"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: adminView && isAdmin ? "type=eq.withdraw" : `user_id=eq.${profile.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    /* eslint-disable-next-line */
  }, [profile?.id, isAdmin, adminView]);

  const filtered = tab === "all" ? rows : rows.filter((r) => r.status === tab || (tab === "failed" && r.status === "rejected"));

  const totals = {
    pending: rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0),
    completed: rows.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0),
  };

  const cur = profile?.currency ?? "USD";

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Withdrawals</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track your payout requests and statuses</p>
        </div>
        {isAdmin && (
          <div className="flex flex-col items-end gap-1.5">
            <Link
              to="/app/admin/withdrawals"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
            >
              <ShieldCheck className="h-3 w-3" /> Admin queue
            </Link>
            <button
              onClick={() => setAdminView((v) => !v)}
              className={`text-[10px] font-medium ${adminView ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {adminView ? "Showing all users" : "Show all users"}
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</div>
          <div className="mt-0.5 text-sm font-bold text-warning">{formatMoney(totals.pending, cur)}</div>
        </div>
        <div className="rounded-2xl border border-success/30 bg-success/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Completed</div>
          <div className="mt-0.5 text-sm font-bold text-success">{formatMoney(totals.completed, cur)}</div>
        </div>
      </div>

      {/* Actions */}
      {!adminView && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setShowDialog(true)} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New withdrawal
          </button>
          <button onClick={() => setShowMethods(true)} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-card">
            Methods
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No withdrawals {tab !== "all" ? `with status "${tab}"` : "yet"}.
          </div>
        )}
        {filtered.map((r) => {
          const st = statusStyle(r.status);
          const Icon = st.icon;
          return (
            <Link
              key={r.id}
              to="/app/transactions/$txId"
              params={{ txId: r.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ArrowUpFromLine className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{r.description ?? "Withdrawal"}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-sm font-bold">-{formatMoney(Number(r.amount), r.currency)}</div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {st.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {showDialog && <WithdrawDialog onClose={() => setShowDialog(false)} onDone={load} onManageMethods={() => { setShowDialog(false); setShowMethods(true); }} />}
      {showMethods && <WithdrawalMethodsManager onClose={() => setShowMethods(false)} />}
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/transactions/$txId")({
  component: TxDetail,
});

type Tx = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  method_id: string | null;
  created_at: string;
};

type Method = { id: string; kind: string; label: string; details: Record<string, unknown> };

function statusStyle(s: string) {
  if (s === "completed") return { label: "Completed", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" };
  if (s === "pending") return { label: "Pending review", icon: Clock, cls: "bg-warning/15 text-warning border-warning/30" };
  if (s === "failed" || s === "rejected") return { label: "Failed", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" };
  return { label: s, icon: Clock, cls: "bg-muted text-muted-foreground border-border" };
}

function TxDetail() {
  const { txId } = Route.useParams();
  const { profile, isAdmin } = useAuth();
  const nav = useNavigate();
  const [tx, setTx] = useState<Tx | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("transactions").select("*").eq("id", txId).maybeSingle();
    setTx(data as Tx | null);
    if (data?.method_id) {
      const { data: m } = await supabase.from("withdrawal_methods").select("id,kind,label,details").eq("id", data.method_id).maybeSingle();
      setMethod(m as Method | null);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [txId]);

  if (!tx) {
    return (
      <div className="px-5 pt-6 pb-8">
        <button onClick={() => nav({ to: "/app/withdrawals" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const st = statusStyle(tx.status);
  const Icon = st.icon;
  const isCredit = tx.type === "deposit" || tx.type === "earning" || tx.type === "referral" || tx.type === "resale_sell";
  const canModerate = isAdmin && tx.user_id !== profile?.id && tx.status === "pending";

  const setStatus = async (next: "completed" | "rejected") => {
    setBusy(true);
    const { error } = await supabase.from("transactions").update({ status: next }).eq("id", tx.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${next}`);
    load();
  };

  const copy = async (val: string, label: string) => {
    await navigator.clipboard.writeText(val);
    toast.success(`${label} copied`);
  };

  return (
    <div className="px-5 pt-6 pb-8">
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero */}
      <div className="mt-5 rounded-2xl border border-border p-5" style={{ background: "var(--gradient-card)" }}>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground capitalize">{tx.type.replace("_", " ")}</div>
        <div className={`mt-1 text-3xl font-bold ${isCredit ? "text-success" : ""}`}>
          {isCredit ? "+" : "-"}{formatMoney(Number(tx.amount), tx.currency)}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium border-border bg-background/40">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${st.cls}`}>
            <Icon className="h-3 w-3" />
            {st.label}
          </span>
        </div>
      </div>

      {/* Details */}
      <section className="mt-5 rounded-2xl border border-border bg-card divide-y divide-border">
        <DetailRow label="Reference" value={tx.id} onCopy={() => copy(tx.id, "Reference")} />
        <DetailRow label="Date" value={new Date(tx.created_at).toLocaleString()} />
        <DetailRow label="Currency" value={tx.currency} />
        {tx.description && <DetailRow label="Description" value={tx.description} />}
      </section>

      {/* Payment method */}
      {method && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold">Payment method</h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground capitalize">{method.kind.replace("_", " ")}</div>
            <div className="mt-0.5 text-sm font-semibold">{method.label}</div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-background/60 p-3 text-[11px] text-muted-foreground">
              {JSON.stringify(method.details, null, 2)}
            </pre>
          </div>
        </section>
      )}

      {/* Admin moderation */}
      {canModerate && (
        <section className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin actions
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Approving marks the withdrawal completed. Rejecting marks it failed; the user's balance is not changed (it was already debited at request time).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => setStatus("completed")}
              className="rounded-xl bg-success py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50">
              Approve
            </button>
            <button disabled={busy} onClick={() => setStatus("rejected")}
              className="rounded-xl border border-destructive/40 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
              Reject
            </button>
          </div>
        </section>
      )}

      <Link to="/app/withdrawals" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
        View all withdrawals
      </Link>
    </div>
  );
}

function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium truncate max-w-[180px]" title={value}>{value}</span>
        {onCopy && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
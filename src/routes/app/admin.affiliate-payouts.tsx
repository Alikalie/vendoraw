import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, CalendarCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/admin/affiliate-payouts")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin"))
      throw redirect({ to: "/app" });
  },
  component: AdminAffiliatePayouts,
});

type Row = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  referral_code?: string | null;
};

const tabs = ["pending", "completed", "rejected", "all"] as const;
type Tab = (typeof tabs)[number];

function isMondayUTC(d = new Date()) {
  return d.getUTCDay() === 1;
}

function AdminAffiliatePayouts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: txs } = await supabase
      .from("transactions")
      .select("id,user_id,amount,currency,status,description,created_at")
      .eq("type", "withdraw")
      .ilike("description", "Affiliate payout request%")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = (txs as Row[]) ?? [];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name,referral_code")
      .in("id", userIds);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    setRows(
      list.map((r) => ({
        ...r,
        email: map.get(r.user_id)?.email ?? null,
        first_name: map.get(r.user_id)?.first_name ?? null,
        last_name: map.get(r.user_id)?.last_name ?? null,
        referral_code: map.get(r.user_id)?.referral_code ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: "completed" | "rejected") => {
    setBusyId(id);
    const { error } = await supabase
      .from("transactions")
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "completed" ? "Marked as paid" : "Rejected");
    load();
  };

  const filtered = tab === "all" ? rows : rows.filter((r) => r.status === tab);
  const mondayNow = isMondayUTC();
  const totalPending = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader
        title="Affiliate payouts"
        subtitle={`${rows.length} total requests`}
        fallbackTo="/app/admin"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Pending payout
          </div>
          <div className="mt-0.5 text-sm font-bold text-warning">
            {formatMoney(totalPending, "USD")}
          </div>
        </div>
        <div
          className={`rounded-2xl border p-3 ${mondayNow ? "border-success/30 bg-success/5" : "border-border bg-card"}`}
        >
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Monday eligibility (UTC)
          </div>
          <div
            className={`mt-0.5 flex items-center gap-1 text-sm font-bold ${mondayNow ? "text-success" : "text-muted-foreground"}`}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            {mondayNow ? "Open — payouts allowed today" : "Closed — opens next Monday"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium capitalize ${
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No {tab === "all" ? "" : tab} affiliate payout requests.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {filtered.map((r) => {
          const requestedAt = new Date(r.created_at);
          const eligibleAtRequest = isMondayUTC(requestedAt);
          const status = r.status;
          return (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">
                      {(r.first_name || "") + " " + (r.last_name || "") || r.email || r.user_id.slice(0, 8)}
                    </h3>
                    {r.referral_code && (
                      <span className="rounded-full border border-primary/40 px-1.5 py-0.5 text-[9px] uppercase text-primary">
                        {r.referral_code}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {r.email ?? r.user_id}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold">{formatMoney(r.amount, r.currency)}</div>
                  <StatusPill status={status} />
                </div>
              </header>

              <p className="mt-2 text-[11px] text-muted-foreground">
                {r.description ?? "Affiliate payout request"}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  Requested {requestedAt.toLocaleString()}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 ${eligibleAtRequest ? "border-success/40 text-success" : "border-warning/40 text-warning"}`}
                >
                  {eligibleAtRequest ? "Monday-eligible request" : "Off-day request"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 ${mondayNow ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}
                >
                  {mondayNow ? "Payable today" : "Wait until Monday"}
                </span>
              </div>

              {status === "pending" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateStatus(r.id, "completed")}
                    disabled={busyId === r.id || !mondayNow}
                    title={!mondayNow ? "Payouts are restricted to Mondays (UTC)" : ""}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-success px-3 py-2 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {busyId === r.id ? "Saving…" : "Mark as paid"}
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "rejected")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  if (status === "rejected" || status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
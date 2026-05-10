import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import {
  ShieldCheck,
  Smartphone,
  Building2,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/withdrawals")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = !!(roles as { role: string }[] | null)?.some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: AdminWithdrawals,
});

type Pending = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  method_id: string | null;
  created_at: string;
};

type MethodMap = Record<string, { kind: string; label: string }>;
type ProfileMap = Record<string, { first_name: string; last_name: string; email: string | null }>;

const kindIcon: Record<string, typeof Smartphone> = {
  mobile_money: Smartphone,
  bank: Building2,
  paypal: Wallet,
};

const kindLabel: Record<string, string> = {
  mobile_money: "Mobile Money",
  bank: "Bank Transfer",
  paypal: "PayPal",
};

function AdminWithdrawals() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Pending[]>([]);
  const [methods, setMethods] = useState<MethodMap>({});
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<null | { action: "approve" | "reject"; ids: string[] }>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id,user_id,amount,currency,status,description,method_id,created_at")
      .eq("type", "withdraw")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    const list = (data as Pending[]) ?? [];
    setRows(list);

    const methodIds = Array.from(new Set(list.map((r) => r.method_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const [mRes, pRes] = await Promise.all([
      methodIds.length
        ? supabase.from("withdrawal_methods").select("id,kind,label").in("id", methodIds)
        : Promise.resolve({ data: [] as { id: string; kind: string; label: string }[] }),
      userIds.length
        ? supabase.from("profiles").select("id,first_name,last_name,email").in("id", userIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              first_name: string;
              last_name: string;
              email: string | null;
            }[],
          }),
    ]);
    const mMap: MethodMap = {};
    (mRes.data ?? []).forEach((m) => {
      mMap[m.id] = { kind: m.kind, label: m.label };
    });
    setMethods(mMap);
    const pMap: ProfileMap = {};
    (pRes.data ?? []).forEach((p) => {
      pMap[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
    });
    setProfiles(pMap);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase
      .channel("admin-withdrawals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: "type=eq.withdraw" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

  // Group by method kind
  const groups = useMemo(() => {
    const g: Record<string, Pending[]> = {};
    rows.forEach((r) => {
      const kind = r.method_id ? (methods[r.method_id]?.kind ?? "other") : "other";
      (g[kind] ??= []).push(r);
    });
    return g;
  }, [rows, methods]);

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);
  const allIds = rows.map((r) => r.id);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (kind: string) => {
    const ids = (groups[kind] ?? []).map((r) => r.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleCollapse = (kind: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const askConfirm = (action: "approve" | "reject", ids?: string[]) => {
    const target = ids ?? Array.from(selected);
    if (!target.length) return toast.error("Select at least one withdrawal");
    setConfirm({ action, ids: target });
  };

  const runAction = async () => {
    if (!confirm) return;
    setBusy(true);
    const status = confirm.action === "approve" ? "completed" : "rejected";
    const { error } = await supabase
      .from("transactions")
      .update({ status })
      .in("id", confirm.ids)
      .eq("status", "pending"); // optimistic guard against double-action
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      `${confirm.action === "approve" ? "Approved" : "Rejected"} ${confirm.ids.length} withdrawal${confirm.ids.length > 1 ? "s" : ""}`,
    );
    setSelected(new Set());
    setConfirm(null);
    load();
  };

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3 w-3" /> Admin
          </div>
          <h1 className="mt-2 text-xl font-bold">Withdrawal queue</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} pending · {formatMoney(totalAmount, rows[0]?.currency ?? "USD")}
          </p>
        </div>
        <Link
          to="/app/withdrawals"
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          My withdrawals →
        </Link>
        <Link to="/app/admin/deposits" className="ml-2 text-[11px] text-primary hover:underline">
          Deposit queue →
        </Link>
      </div>

      {/* Bulk action bar */}
      <div className="sticky top-0 z-10 -mx-5 mt-4 border-b border-border bg-background/90 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(allIds))}
              className="h-4 w-4 rounded border-border accent-primary"
              disabled={!rows.length}
            />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
          <div className="ml-auto flex gap-2">
            <button
              disabled={!selected.size}
              onClick={() => askConfirm("reject")}
              className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
            >
              Reject
            </button>
            <button
              disabled={!selected.size}
              onClick={() => askConfirm("approve")}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Approve
            </button>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="mt-4 space-y-4">
        {loading && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
            Loading queue…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
            <p className="text-sm font-semibold">All clear</p>
            <p className="text-xs text-muted-foreground">No pending withdrawals.</p>
          </div>
        )}
        {Object.entries(groups).map(([kind, list]) => {
          const Icon = kindIcon[kind] ?? Wallet;
          const isCollapsed = collapsed.has(kind);
          const groupTotal = list.reduce((s, r) => s + Number(r.amount), 0);
          const ids = list.map((r) => r.id);
          const allInGroup = ids.every((id) => selected.has(id));
          return (
            <section
              key={kind}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <header className="flex items-center gap-3 border-b border-border bg-background/40 px-4 py-3">
                <button
                  onClick={() => toggleCollapse(kind)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{kindLabel[kind] ?? kind}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {list.length} request{list.length > 1 ? "s" : ""} ·{" "}
                    {formatMoney(groupTotal, list[0].currency)}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allInGroup}
                    onChange={() => toggleGroup(kind)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Group
                </label>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => askConfirm("reject", ids)}
                    className="rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10"
                  >
                    Reject all
                  </button>
                  <button
                    onClick={() => askConfirm("approve", ids)}
                    className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Approve all
                  </button>
                </div>
              </header>
              {!isCollapsed && (
                <ul className="divide-y divide-border">
                  {list.map((r) => {
                    const m = r.method_id ? methods[r.method_id] : undefined;
                    const p = profiles[r.user_id];
                    const isSel = selected.has(r.id);
                    return (
                      <li
                        key={r.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSel ? "bg-primary/5" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggle(r.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <Link
                          to="/app/transactions/$txId"
                          params={{ txId: r.id }}
                          className="flex-1 min-w-0"
                        >
                          <div className="text-sm font-semibold truncate">
                            {p ? `${p.first_name} ${p.last_name}` : "Unknown user"}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {m?.label ?? "—"} · {new Date(r.created_at).toLocaleString()}
                          </div>
                        </Link>
                        <div className="text-right">
                          <div className="text-sm font-bold">
                            -{formatMoney(Number(r.amount), r.currency)}
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                            Pending
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => askConfirm("approve", [r.id])}
                            className="rounded-md bg-success/15 p-1 text-success hover:bg-success/25"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => askConfirm("reject", [r.id])}
                            className="rounded-md bg-destructive/15 p-1 text-destructive hover:bg-destructive/25"
                            title="Reject"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => !busy && setConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">
              {confirm.action === "approve" ? "Approve" : "Reject"} {confirm.ids.length} withdrawal
              {confirm.ids.length > 1 ? "s" : ""}?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirm.action === "approve"
                ? "Selected requests will be marked completed. Users' balances were already debited at request time."
                : "Selected requests will be marked rejected. Note: balances are NOT auto-refunded — credit users manually if needed."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                disabled={busy}
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-background/40 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={runAction}
                className={`rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 ${
                  confirm.action === "approve"
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-destructive text-destructive-foreground hover:opacity-90"
                }`}
              >
                {busy ? "Working…" : confirm.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

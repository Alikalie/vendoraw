import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { callAuthed } from "@/lib/server-call";
import { moderateDeposit } from "@/server/deposits";

export const Route = createFileRoute("/app/admin/deposits")({
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
  component: AdminDeposits,
});

type Pending = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  proof_path: string | null;
  created_at: string;
};
type ProfileMap = Record<string, { first_name: string; last_name: string; email: string | null }>;

function AdminDeposits() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Pending[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id,user_id,amount,currency,status,description,proof_path,created_at")
      .eq("type", "deposit")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    const list = (data as Pending[]) ?? [];
    setRows(list);

    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: ps } = await supabase.from("profiles")
        .select("id,first_name,last_name,email").in("id", userIds);
      const map: ProfileMap = {};
      (ps ?? []).forEach((p) => { map[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email }; });
      setProfiles(map);
    }

    // Sign all proof URLs
    const urlMap: Record<string, string> = {};
    await Promise.all(list.map(async (r) => {
      if (!r.proof_path) return;
      const { data: signed } = await supabase.storage.from("payment-proofs")
        .createSignedUrl(r.proof_path, 60 * 30);
      if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
    }));
    setProofs(urlMap);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase
      .channel("admin-deposits")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: "type=eq.deposit" },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  const moderate = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const res = await callAuthed(moderateDeposit, { txId: id, action });
      if (action === "approve") {
        toast.success(`Approved — credited ${res.credited ?? ""}`);
      } else {
        toast.success("Deposit rejected");
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3 w-3" /> Admin
          </div>
          <h1 className="mt-2 text-xl font-bold">Deposit approvals</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} pending · {formatMoney(totalAmount, rows[0]?.currency ?? "USD")}
          </p>
        </div>
        <Link to="/app/admin/withdrawals" className="text-[11px] text-muted-foreground hover:text-foreground">Withdrawals →</Link>
      </div>

      <div className="mt-5 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
            <p className="text-sm font-semibold">All clear</p>
            <p className="text-xs text-muted-foreground">No deposits awaiting approval.</p>
          </div>
        )}
        {rows.map((r) => {
          const p = profiles[r.user_id];
          const proof = proofs[r.id];
          const isBusy = busyId === r.id;
          return (
            <article key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-border bg-background/40 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {p ? `${p.first_name} ${p.last_name}` : r.user_id.slice(0, 8)}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {p?.email ?? ""} · {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-success">+{formatMoney(Number(r.amount), r.currency)}</div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-1.5 py-0.5 text-[9px] font-medium text-warning">
                    Pending
                  </span>
                </div>
              </header>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[180px_1fr]">
                <div>
                  {proof ? (
                    <a href={proof} target="_blank" rel="noreferrer" className="block">
                      <img src={proof} alt="proof" className="h-32 w-full rounded-lg object-cover bg-background/60" />
                    </a>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                      <ImageIcon className="mr-1 h-3 w-3" /> No proof
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{r.description ?? "Deposit"}</p>
                  <div className="flex gap-2">
                    <button disabled={isBusy} onClick={() => moderate(r.id, "reject")}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-destructive/40 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                    <button disabled={isBusy} onClick={() => moderate(r.id, "approve")}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve & credit
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

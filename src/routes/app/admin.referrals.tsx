import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Users, Loader2, Trophy } from "lucide-react";

export const Route = createFileRoute("/app/admin/referrals")({
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
  component: AdminAffiliates,
});

type App = {
  id: string;
  user_id: string;
  status: string;
  desired_code: string;
  full_name: string;
  email: string;
  payout_account: string;
  created_at: string;
  reject_reason: string | null;
};
type Affiliate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  referral_code: string;
  total_earned: number;
  currency: string;
};

function AdminAffiliates() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "affiliates">("pending");
  const [apps, setApps] = useState<App[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [a, p] = await Promise.all([
      supabase
        .from("referral_applications")
        .select(
          "id,user_id,status,desired_code,full_name,email,payout_account,created_at,reject_reason",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id,first_name,last_name,email,referral_code,total_earned,currency")
        .not("referral_code", "is", null),
    ]);
    setApps((a.data as App[]) ?? []);
    const affs = (p.data as Affiliate[]) ?? [];
    setAffiliates(affs);

    if (affs.length) {
      const ids = affs.map((x) => x.id);
      const { data: refs } = await supabase
        .from("profiles")
        .select("referred_by")
        .in("referred_by", ids);
      const counts: Record<string, number> = {};
      (refs ?? []).forEach((r: { referred_by: string | null }) => {
        if (r.referred_by) counts[r.referred_by] = (counts[r.referred_by] ?? 0) + 1;
      });
      setSignupCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc(
      "approve_referral_application" as never,
      { _app_id: id } as never,
    );
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Application approved");
    load();
  };
  const reject = async (id: string) => {
    const reason = prompt("Reason (optional):") ?? "";
    setBusy(id);
    const { error } = await supabase.rpc(
      "reject_referral_application" as never,
      { _app_id: id, _reason: reason } as never,
    );
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Application rejected");
    load();
  };

  const filtered = tab === "affiliates" ? [] : apps.filter((x) => x.status === tab);
  const counts = {
    pending: apps.filter((x) => x.status === "pending").length,
    approved: apps.filter((x) => x.status === "approved").length,
    rejected: apps.filter((x) => x.status === "rejected").length,
    affiliates: affiliates.length,
  };

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Affiliates" subtitle="Admin" />
      <h1 className="text-xl font-bold">Affiliate program</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Review applications, manage approved affiliates and track commissions.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {(["pending", "approved", "rejected", "affiliates"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-card"
            }`}
          >
            {t} <span className="opacity-60">({counts[t]})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && tab !== "affiliates" && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No {tab} applications.
          </div>
        )}

        {!loading &&
          tab !== "affiliates" &&
          filtered.map((a) => (
            <article key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.full_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.email} · {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <code className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold tracking-wider">
                  {a.desired_code}
                </code>
              </header>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Payout:</span> {a.payout_account}
                </div>
                <div>
                  <span className="text-muted-foreground">User ID:</span>{" "}
                  <code className="text-[10px]">{a.user_id.slice(0, 8)}…</code>
                </div>
              </div>
              {a.reject_reason && (
                <p className="mt-2 text-[11px] text-destructive">
                  Rejection reason: {a.reject_reason}
                </p>
              )}
              {a.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy === a.id}
                    onClick={() => reject(a.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-destructive/40 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    disabled={busy === a.id}
                    onClick={() => approve(a.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                </div>
              )}
            </article>
          ))}

        {!loading && tab === "affiliates" && (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {affiliates.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No approved affiliates yet.
              </div>
            )}
            {affiliates.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {a.first_name} {a.last_name}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{a.email}</div>
                </div>
                <div className="text-right">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
                    {a.referral_code}
                  </code>
                  <div className="mt-0.5 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <Users className="h-3 w-3" /> {signupCounts[a.id] ?? 0}
                    </span>
                    <span className="text-success font-semibold">
                      +{Number(a.total_earned).toFixed(2)} {a.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

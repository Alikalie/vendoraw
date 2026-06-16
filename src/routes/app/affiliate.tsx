import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { toast } from "sonner";
import {
  Users,
  Copy,
  Trophy,
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  Wallet,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/app/affiliate")({
  component: AffiliatePage,
});

type Application = {
  id: string;
  status: "pending" | "approved" | "rejected";
  desired_code: string;
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Referred = { id: string; first_name: string; last_name: string; created_at: string };
type Commission = {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  description: string | null;
};

function AffiliatePage() {
  const { profile } = useAuth();
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [referred, setReferred] = useState<Referred[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rate, setRate] = useState(0.05);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile) return;
    const [inv, apps, refs, comms, setting] = await Promise.all([
      supabase
        .from("investments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "completed"),
      supabase
        .from("referral_applications")
        .select("id,status,desired_code,reject_reason,created_at,reviewed_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("profiles")
        .select("id,first_name,last_name,created_at")
        .eq("referred_by", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id,amount,currency,created_at,description")
        .eq("user_id", profile.id)
        .eq("type", "referral")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "affiliate_commission_rate")
        .maybeSingle(),
    ]);
    setCompletedCount(inv.count ?? 0);
    setApp((apps.data?.[0] as Application | undefined) ?? null);
    setReferred((refs.data as Referred[]) ?? []);
    setCommissions((comms.data as Commission[]) ?? []);
    if (setting.data?.value != null) setRate(Number(setting.data.value as unknown));
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [profile?.id]);

  const isApproved = !!profile?.referral_code;
  const totalCommission = useMemo(
    () => commissions.reduce((s, c) => s + Number(c.amount), 0),
    [commissions],
  );
  const cur = profile?.currency;

  if (!profile) return null;

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Affiliate program" subtitle="Earn from every deposit" />

      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-transparent p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="h-4 w-4" /> Earn {(rate * 100).toFixed(1)}% on every referred deposit
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your promo code, and every time someone you referred makes a deposit, you earn a
          commission added straight to your wallet — withdrawable anytime.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : isApproved ? (
        <ApprovedDashboard
          code={profile.referral_code!}
          referred={referred}
          commissions={commissions}
          totalCommission={totalCommission}
          currency={cur ?? "USD"}
        />
      ) : app && app.status === "pending" ? (
        <PendingCard app={app} />
      ) : (
        <ApplyCard
          completed={completedCount ?? 0}
          rejected={app && app.status === "rejected" ? app : null}
          email={profile.email ?? ""}
          fullName={`${profile.first_name} ${profile.last_name}`}
          userId={profile.id}
          onSubmitted={load}
        />
      )}
    </div>
  );
}

function ApprovedDashboard({
  code,
  referred,
  commissions,
  totalCommission,
  currency,
}: {
  code: string;
  referred: Referred[];
  commissions: Commission[];
  totalCommission: number;
  currency: string;
}) {
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/register?code=${code}` : "";
  const copy = async (val: string, label: string) => {
    await navigator.clipboard.writeText(val);
    toast.success(`${label} copied`);
  };
  const { profile } = useAuth();
  const [payoutAmt, setPayoutAmt] = useState("");
  const [requesting, setRequesting] = useState(false);
  const isMonday = new Date().getUTCDay() === 1;
  const MIN = 25;
  const requestPayout = async () => {
    const amt = Number(payoutAmt);
    if (!isFinite(amt) || amt <= 0) return toast.error("Enter an amount");
    if (!isMonday) return toast.error("Affiliate payouts are only available on Mondays (UTC)");
    if (amt < MIN) return toast.error(`Minimum payout is $${MIN}`);
    setRequesting(true);
    const { error } = await supabase.rpc("request_affiliate_payout" as never, {
      _amount: amt,
    } as never);
    setRequesting(false);
    if (error) return toast.error(error.message);
    toast.success("Payout requested — awaiting admin approval");
    setPayoutAmt("");
  };
  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
          <Trophy className="h-3 w-3" /> Approved affiliate
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
          Your promo code
        </div>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-base font-bold tracking-wider">
            {code}
          </code>
          <button
            onClick={() => copy(code, "Code")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-card"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
          Share link
        </div>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl border border-border bg-background px-3 py-2 text-xs">
            {link}
          </code>
          <button
            onClick={() => copy(link, "Link")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-card"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Signups" value={referred.length.toLocaleString()} />
        <Stat
          icon={Wallet}
          label="Total commission"
          value={`${totalCommission.toFixed(2)} ${currency}`}
          tone="success"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Request payout</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isMonday ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
          >
            {isMonday ? "Open today" : "Mondays only"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Minimum ${MIN} · paid Mondays (UTC) · available balance{" "}
          <span className="font-semibold text-foreground">
            {Number(profile?.balance ?? 0).toFixed(2)} {currency}
          </span>
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={payoutAmt}
            onChange={(e) => setPayoutAmt(e.target.value)}
            placeholder={`Amount (min $${MIN})`}
            className="flex-1 rounded-xl border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            disabled={requesting || !isMonday}
            onClick={requestPayout}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {requesting ? "…" : "Request"}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payout history
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {commissions.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No commissions yet — invite your first user to start earning.
            </div>
          )}
          {commissions.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {c.description ?? "Affiliate commission"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm font-bold text-success">
                +{Number(c.amount).toFixed(2)} {c.currency}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Referred users ({referred.length})
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {referred.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No signups with your code yet.
            </div>
          )}
          {referred.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div className="text-sm">
                {r.first_name} {r.last_name}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PendingCard({ app }: { app: Application }) {
  return (
    <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/5 p-5 text-center">
      <Clock className="mx-auto h-6 w-6 text-warning" />
      <h2 className="mt-2 text-base font-bold">Application under review</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Submitted {new Date(app.created_at).toLocaleDateString()} for code{" "}
        <span className="font-mono font-semibold">{app.desired_code}</span>. Our team will review
        shortly.
      </p>
    </div>
  );
}

function ApplyCard({
  completed,
  rejected,
  email,
  fullName,
  userId,
  onSubmitted,
}: {
  completed: number;
  rejected: Application | null;
  email: string;
  fullName: string;
  userId: string;
  onSubmitted: () => void;
}) {
  const REQUIRED = 10;
  const eligible = completed >= REQUIRED;
  const [code, setCode] = useState("");
  const [payout, setPayout] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!eligible) return;
    if (!/^[A-Z0-9]{4,12}$/i.test(code.trim()))
      return toast.error("Code must be 4–12 letters/numbers");
    if (payout.trim().length < 4) return toast.error("Provide a payout account");
    setSubmitting(true);
    const { error } = await supabase.from("referral_applications").insert({
      user_id: userId,
      desired_code: code.trim().toUpperCase(),
      full_name: fullName,
      email,
      account_id: userId,
      payout_account: payout.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted!");
    onSubmitted();
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Eligibility
          </div>
          {eligible ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" /> Qualified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {completed}
              <span className="text-base font-normal text-muted-foreground"> / {REQUIRED}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">completed investments</div>
          </div>
          <Link to="/app/market" className="text-[11px] font-semibold text-primary hover:underline">
            Browse products →
          </Link>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, (completed / REQUIRED) * 100)}%` }}
          />
        </div>
      </div>

      {rejected && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
            <XCircle className="h-4 w-4" /> Previous application rejected
          </div>
          {rejected.reject_reason && (
            <p className="mt-1 text-xs text-muted-foreground">Reason: {rejected.reject_reason}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">You may apply again below.</p>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-base font-bold">Apply for affiliate program</h2>
        <p className="text-xs text-muted-foreground">
          Choose a unique promo code and a payout method. Approval is manual.
        </p>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Desired promo code</span>
          <input
            disabled={!eligible}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="e.g. JOHN2026"
            className="mt-1 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm uppercase tracking-wider outline-none focus:border-primary disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Payout account (bank / mobile money / wallet)
          </span>
          <input
            disabled={!eligible}
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            placeholder="Account number or wallet address"
            className="mt-1 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
        </label>

        <button
          disabled={!eligible || submitting}
          className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {!eligible
            ? `Complete ${REQUIRED - completed} more investments to apply`
            : submitting
              ? "Submitting…"
              : "Submit application"}
        </button>
      </form>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "primary" | "success";
}) {
  const t =
    tone === "success"
      ? "text-success border-success/30 bg-success/5"
      : "text-primary border-primary/30 bg-primary/5";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${t}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-bold truncate">{value}</div>
    </div>
  );
}

// keep TrendingUp import used (avoid TS unused warning) — used for tones in future
void TrendingUp;

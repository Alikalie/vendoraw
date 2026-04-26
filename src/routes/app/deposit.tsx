import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/data/countries";
import { toast } from "sonner";
import { ArrowLeft, Copy, Upload, X, ImageIcon, CheckCircle2, Clock } from "lucide-react";
import { callAuthed } from "@/lib/server-call";
import { requestDeposit } from "@/server/deposits";
import type { WithdrawalMethod } from "@/components/app/WithdrawalMethods";

export const Route = createFileRoute("/app/deposit")({
  component: DepositPage,
});

type Step = "amount" | "instructions" | "proof" | "review" | "submitted";

function DepositPage() {
  const { profile, user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState<string>("");
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [instructions, setInstructions] = useState<{ title: string; body: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("withdrawal_methods").select("*").eq("user_id", profile.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = (data as unknown as WithdrawalMethod[]) ?? [];
        setMethods(list);
        if (list[0]) setMethodId(list[0].id);
      });
    supabase.from("site_content" as never).select("title,body").eq("id", "deposit_instructions").maybeSingle()
      .then(({ data }) => setInstructions(data as { title: string; body: string } | null));
  }, [profile?.id]);

  const cur = profile?.currency ?? "USD";
  const amt = Number(amount);
  const validAmount = isFinite(amt) && amt > 0;

  // Realtime: when admin approves, jump straight to home with a toast
  useEffect(() => {
    if (!submittedId || !user) return;
    const ch = supabase
      .channel(`dep-${submittedId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${submittedId}` },
        async (payload) => {
          const next = payload.new as { status: string };
          if (next.status === "completed") {
            await refreshProfile();
            toast.success("Deposit approved! Balance updated.");
          } else if (next.status === "rejected") {
            toast.error("Deposit was rejected by admin.");
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [submittedId, user, refreshProfile]);

  const cancel = () => {
    if (busy) return;
    nav({ to: "/app" });
  };

  const goNext = () => {
    if (step === "amount") {
      if (!validAmount) return toast.error("Enter a valid amount");
      setStep("instructions");
    } else if (step === "instructions") {
      setStep("proof");
    } else if (step === "proof") {
      if (!file) return toast.error("Upload a screenshot of your payment");
      setStep("review");
    }
  };

  const goBack = () => {
    if (step === "instructions") setStep("amount");
    else if (step === "proof") setStep("instructions");
    else if (step === "review") setStep("proof");
  };

  const onFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) return toast.error("Please upload an image");
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!profile || !user || !file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uErr } = await supabase.storage.from("payment-proofs").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (uErr) throw new Error(uErr.message);

      const res = await callAuthed(requestDeposit, {
        amount: amt,
        methodId: methodId || undefined,
        proofPath: path,
      });
      setSubmittedId(res.id);
      setStep("submitted");
      toast.success("Deposit submitted for approval");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  const copyAccountLine = async (line: string) => {
    await navigator.clipboard.writeText(line);
    toast.success("Copied");
  };

  // Parse instruction body to find "Account number: XXX" and "Account name: XXX" for copy buttons
  const accountFields = useMemo(() => {
    if (!instructions) return [];
    const lines = instructions.body.split("\n");
    return lines
      .map((l) => l.match(/^([^:]+):\s*(.+)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => ({ label: m[1].trim(), value: m[2].trim() }));
  }, [instructions]);

  if (!profile) return null;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={step === "submitted" ? () => nav({ to: "/app" }) : goBack}
          disabled={step === "amount"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:invisible">
          <ArrowLeft className="h-4 w-4" /> {step === "submitted" ? "Home" : "Back"}
        </button>
        {step !== "submitted" && (
          <button onClick={cancel} disabled={busy}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>

      {/* Stepper */}
      {step !== "submitted" && (
        <div className="mt-4 flex items-center gap-1.5">
          {(["amount", "instructions", "proof", "review"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${
              ["amount", "instructions", "proof", "review"].indexOf(step) >= i ? "bg-primary" : "bg-border"
            }`} />
          ))}
        </div>
      )}

      <h1 className="mt-5 text-xl font-bold">
        {step === "amount" && "Deposit funds"}
        {step === "instructions" && "Payment instructions"}
        {step === "proof" && "Upload payment proof"}
        {step === "review" && "Review & submit"}
        {step === "submitted" && "Awaiting approval"}
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Available balance: <span className="font-semibold text-foreground">{formatMoney(profile.balance, cur)}</span>
      </p>

      {/* STEP: amount */}
      {step === "amount" && (
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Amount ({cur})</span>
            <input type="number" inputMode="decimal" min={1} value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              className="mt-1 w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-2xl font-bold outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Method (optional)</span>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background/30 px-3 py-2.5 text-sm outline-none focus:border-primary">
              <option value="">Manual / not specified</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={cancel}
              className="rounded-xl border border-border py-3 text-sm font-semibold hover:bg-card">Cancel</button>
            <button onClick={goNext} disabled={!validAmount}
              className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Continue</button>
          </div>
        </div>
      )}

      {/* STEP: instructions */}
      {step === "instructions" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">You will pay</div>
            <div className="mt-0.5 text-2xl font-bold">{formatMoney(amt, cur)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{instructions?.title ?? "How to pay"}</h2>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-sans">
              {instructions?.body ?? "Loading instructions…"}
            </pre>
            {accountFields.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {accountFields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase text-muted-foreground">{f.label}</div>
                      <div className="text-xs font-semibold truncate">{f.value}</div>
                    </div>
                    <button onClick={() => copyAccountLine(f.value)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-card">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={cancel} className="rounded-xl border border-border py-3 text-sm font-semibold hover:bg-card">Cancel</button>
            <button onClick={goNext} className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">I've paid — continue</button>
          </div>
        </div>
      )}

      {/* STEP: proof */}
      {step === "proof" && (
        <div className="mt-6 space-y-4">
          <label className="block rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center cursor-pointer hover:border-primary">
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="preview" className="mx-auto max-h-48 rounded-lg object-contain" />
                <div className="text-[11px] text-muted-foreground truncate">{file?.name}</div>
                <div className="text-[11px] text-primary">Tap to choose another</div>
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <Upload className="mx-auto h-8 w-8" />
                <div className="text-sm font-medium">Upload payment screenshot</div>
                <div className="text-[11px]">PNG/JPG up to 5MB</div>
              </div>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={cancel} className="rounded-xl border border-border py-3 text-sm font-semibold hover:bg-card">Cancel</button>
            <button onClick={goNext} disabled={!file}
              className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Continue</button>
          </div>
        </div>
      )}

      {/* STEP: review */}
      {step === "review" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            <Row label="Amount" value={formatMoney(amt, cur)} />
            <Row label="Method" value={methods.find((m) => m.id === methodId)?.label ?? "Manual"} />
            <Row label="Status" value="Pending admin approval" />
          </div>
          {previewUrl && (
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ImageIcon className="h-3 w-3" /> Proof attached
              </div>
              <img src={previewUrl} alt="proof" className="max-h-48 w-full rounded-lg object-contain bg-background/40" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={cancel} disabled={busy}
              className="rounded-xl border border-border py-3 text-sm font-semibold hover:bg-card disabled:opacity-50">Cancel</button>
            <button onClick={submit} disabled={busy}
              className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {busy ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        </div>
      )}

      {/* STEP: submitted */}
      {step === "submitted" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5 text-center">
            <Clock className="mx-auto h-8 w-8 text-warning" />
            <h2 className="mt-3 text-base font-semibold">Waiting for admin approval</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your deposit of <span className="font-semibold text-foreground">{formatMoney(amt, cur)}</span> is pending.
              You'll be notified instantly when it's approved and your wallet is updated automatically.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/app" className="rounded-xl border border-border py-3 text-center text-sm font-semibold hover:bg-card">Home</Link>
            {submittedId && (
              <Link to="/app/transactions/$txId" params={{ txId: submittedId }}
                className="rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">
                <CheckCircle2 className="inline h-4 w-4 mr-1" /> View receipt
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-right truncate max-w-[200px]" title={value}>{value}</span>
    </div>
  );
}

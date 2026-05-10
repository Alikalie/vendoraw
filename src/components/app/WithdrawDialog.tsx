import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { X } from "lucide-react";
import { formatMoney } from "@/data/countries";
import { requestWithdrawal } from "@/server/withdrawals";
import type { WithdrawalMethod } from "./WithdrawalMethods";
import { callAuthed } from "@/lib/server-call";

export function WithdrawDialog({
  onClose,
  onDone,
  onManageMethods,
}: {
  onClose: () => void;
  onDone: () => void;
  onManageMethods: () => void;
}) {
  const { profile } = useAuth();
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("withdrawal_methods")
      .select("*")
      .eq("user_id", profile.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = (data as unknown as WithdrawalMethod[]) ?? [];
        setMethods(list);
        if (list[0]) setMethodId(list[0].id);
      });
  }, [profile?.id]);

  if (!profile) return null;
  const cur = profile.currency;

  const submit = async () => {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > Number(profile.balance)) return toast.error("Insufficient balance");
    if (!methodId) return toast.error("Select a withdrawal method");
    setBusy(true);
    try {
      await callAuthed(requestWithdrawal, { amount: amt, methodId });
      toast.success("Withdrawal requested");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Withdraw funds</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-background/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Available: {formatMoney(profile.balance, cur)}
        </div>

        {methods.length === 0 ? (
          <div className="mt-5 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Add a withdrawal method first.</p>
            <button
              onClick={() => {
                onClose();
                onManageMethods();
              }}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Add a method
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Method
              </span>
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background/30 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Amount ({cur})
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl border border-border bg-background/30 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Processing…" : "Request withdrawal"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              Withdrawals are queued as pending in this educational simulation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

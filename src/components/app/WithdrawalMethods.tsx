import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { z } from "zod";
import { Smartphone, Building2, Mail, Plus, Trash2, Star, X } from "lucide-react";

type Kind = "mobile_money" | "bank" | "paypal";

export type WithdrawalMethod = {
  id: string;
  user_id: string;
  kind: Kind;
  label: string;
  details: Record<string, string>;
  is_default: boolean;
  created_at: string;
};

const mmSchema = z.object({
  provider: z.string().trim().min(2).max(40),
  phone: z.string().trim().min(5).max(20).regex(/^[+0-9 ()-]+$/, "Invalid phone"),
  account_name: z.string().trim().min(2).max(80),
});
const bankSchema = z.object({
  bank_name: z.string().trim().min(2).max(80),
  account_number: z.string().trim().min(4).max(34).regex(/^[A-Z0-9 -]+$/i, "Invalid account number"),
  account_name: z.string().trim().min(2).max(80),
  swift: z.string().trim().max(11).optional().or(z.literal("")),
});
const paypalSchema = z.object({
  email: z.string().trim().email().max(120),
});

export function WithdrawalMethodsManager({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [adding, setAdding] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("withdrawal_methods")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    setMethods((data as unknown as WithdrawalMethod[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  if (!profile) return null;

  const remove = async (id: string) => {
    if (!confirm("Remove this withdrawal method?")) return;
    const { error } = await supabase.from("withdrawal_methods").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const setDefault = async (id: string) => {
    setBusy(true);
    await supabase.from("withdrawal_methods").update({ is_default: false }).eq("user_id", profile.id);
    const { error } = await supabase.from("withdrawal_methods").update({ is_default: true }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Default updated");
    load();
  };

  const add = async (kind: Kind, details: Record<string, string>, label: string) => {
    setBusy(true);
    const { error } = await supabase.from("withdrawal_methods").insert({
      user_id: profile.id, kind, label, details,
      is_default: methods.length === 0,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Method added");
    setAdding(null);
    load();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Withdrawal methods</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-background/40"><X className="h-4 w-4" /></button>
        </div>

        {!adding && (
          <>
            <div className="mt-4 space-y-2">
              {methods.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No methods yet. Add one to receive withdrawals.
                </div>
              )}
              {methods.map((m) => (
                <div key={m.id} className="flex items-start gap-3 rounded-2xl border border-border bg-background/30 p-3">
                  <KindIcon kind={m.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold truncate">{m.label}</div>
                      {m.is_default && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">Default</span>}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{summarize(m)}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!m.is_default && (
                      <button onClick={() => setDefault(m.id)} disabled={busy} title="Set default"
                        className="rounded-full p-1.5 hover:bg-primary/10"><Star className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    )}
                    <button onClick={() => remove(m.id)} title="Remove"
                      className="rounded-full p-1.5 hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <AddBtn icon={Smartphone} label="Mobile" onClick={() => setAdding("mobile_money")} />
              <AddBtn icon={Building2} label="Bank" onClick={() => setAdding("bank")} />
              <AddBtn icon={Mail} label="PayPal" onClick={() => setAdding("paypal")} />
            </div>
          </>
        )}

        {adding === "mobile_money" && <MobileMoneyForm busy={busy} onCancel={() => setAdding(null)} onSubmit={(d) => add("mobile_money", d, `${d.provider} · ${d.phone}`)} />}
        {adding === "bank" && <BankForm busy={busy} onCancel={() => setAdding(null)} onSubmit={(d) => add("bank", d, `${d.bank_name} · ****${d.account_number.slice(-4)}`)} />}
        {adding === "paypal" && <PaypalForm busy={busy} onCancel={() => setAdding(null)} onSubmit={(d) => add("paypal", d, `PayPal · ${d.email}`)} />}
      </div>
    </div>
  );
}

function summarize(m: WithdrawalMethod) {
  if (m.kind === "mobile_money") return `${m.details.provider ?? ""} • ${m.details.phone ?? ""}`;
  if (m.kind === "bank") return `${m.details.bank_name ?? ""} • ${m.details.account_name ?? ""}`;
  return m.details.email ?? "";
}

function KindIcon({ kind }: { kind: Kind }) {
  const Icon = kind === "mobile_money" ? Smartphone : kind === "bank" ? Building2 : Mail;
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
      <Icon className="h-4 w-4" />
    </div>
  );
}

function AddBtn({ icon: Icon, label, onClick }: { icon: typeof Smartphone; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-2xl border border-border p-3 text-xs hover:bg-background/40">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <Plus className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}

function FormShell({ title, children, onCancel, busy, onSubmit }: {
  title: string; children: React.ReactNode; onCancel: () => void; busy: boolean; onSubmit: () => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="text-sm font-semibold">{title}</div>
      {children}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-border py-2.5 text-sm">Cancel</button>
        <button onClick={onSubmit} disabled={busy} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Saving…" : "Save method"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input {...props} className="mt-1 w-full rounded-xl border border-border bg-background/30 px-3 py-2.5 text-sm outline-none focus:border-primary" />
    </label>
  );
}

function MobileMoneyForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (d: { provider: string; phone: string; account_name: string }) => void }) {
  const [form, setForm] = useState({ provider: "", phone: "", account_name: "" });
  const submit = () => {
    const r = mmSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    onSubmit(r.data);
  };
  return (
    <FormShell title="Add mobile money" onCancel={onCancel} onSubmit={submit} busy={busy}>
      <Field label="Provider" placeholder="MTN, Orange, Afrimoney…" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
      <Field label="Phone number" placeholder="+232 76 000 000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Field label="Account name" placeholder="Full name on account" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
    </FormShell>
  );
}

function BankForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (d: { bank_name: string; account_number: string; account_name: string; swift?: string }) => void }) {
  const [form, setForm] = useState({ bank_name: "", account_number: "", account_name: "", swift: "" });
  const submit = () => {
    const r = bankSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    onSubmit(r.data);
  };
  return (
    <FormShell title="Add bank account" onCancel={onCancel} onSubmit={submit} busy={busy}>
      <Field label="Bank name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
      <Field label="Account number / IBAN" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
      <Field label="Account name" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
      <Field label="SWIFT / BIC (optional)" value={form.swift} onChange={(e) => setForm({ ...form, swift: e.target.value })} />
    </FormShell>
  );
}

function PaypalForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (d: { email: string }) => void }) {
  const [form, setForm] = useState({ email: "" });
  const submit = () => {
    const r = paypalSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    onSubmit(r.data);
  };
  return (
    <FormShell title="Add PayPal" onCancel={onCancel} onSubmit={submit} busy={busy}>
      <Field label="PayPal email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    </FormShell>
  );
}
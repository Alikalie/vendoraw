import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { Plus, Pencil, Trash2, Power, X, Loader2, Eye, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/payment-accounts")({
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
  component: AdminPaymentAccounts,
});

type Account = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  instructions: string;
  details: Record<string, string>;
  active: boolean;
  sort_order: number;
};

const blank = {
  name: "",
  kind: "bank",
  currency: "USD",
  instructions: "",
  detailsJson: "{}",
  active: true,
  sort_order: 0,
};

function AdminPaymentAccounts() {
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payment_accounts" as never)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data as Account[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name,
      kind: a.kind,
      currency: a.currency,
      instructions: a.instructions,
      detailsJson: JSON.stringify(a.details ?? {}, null, 2),
      active: a.active,
      sort_order: a.sort_order,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    let details: Record<string, string> = {};
    try {
      details = form.detailsJson.trim() ? JSON.parse(form.detailsJson) : {};
    } catch {
      return toast.error("Details must be valid JSON");
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      currency: form.currency.trim().toUpperCase(),
      instructions: form.instructions,
      details,
      active: form.active,
      sort_order: Number(form.sort_order) || 0,
    };
    const tbl = supabase.from("payment_accounts" as never) as unknown as {
      update: (p: unknown) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
      insert: (p: unknown) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = editing
      ? await tbl.update(payload).eq("id", editing.id)
      : await tbl.insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Created");
    setOpen(false);
    load();
  };

  const toggleActive = async (a: Account) => {
    const tbl = supabase.from("payment_accounts" as never) as unknown as {
      update: (p: unknown) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
    const { error } = await tbl.update({ active: !a.active }).eq("id", a.id);
    if (error) return toast.error(error.message);
    setItems((p) => p.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
  };

  const remove = async (a: Account) => {
    if (!confirm(`Delete payment account "${a.name}"?`)) return;
    const { error } = await supabase.from("payment_accounts" as never).delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setItems((p) => p.filter((x) => x.id !== a.id));
    toast.success("Deleted");
  };

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader
        title="Payment accounts"
        subtitle={`${items.length} destinations`}
        fallbackTo="/app/admin"
        right={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        }
      />

      {loading && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No payment accounts yet. Add one so users have somewhere to deposit.
        </div>
      )}

      <div className="space-y-3">
        {items.map((a) => (
          <article
            key={a.id}
            className={`rounded-2xl border p-4 ${a.active ? "border-border bg-card" : "border-dashed border-muted bg-card/50 opacity-70"}`}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">{a.name}</h3>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                    {a.kind}
                  </span>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase">
                    {a.currency}
                  </span>
                  {!a.active && (
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                  {a.instructions || <em>No instructions</em>}
                </p>
              </div>
            </header>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => openEdit(a)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-background/40"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => toggleActive(a)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-background/40"
              >
                <Power className="h-3 w-3" /> {a.active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => remove(a)}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold">
                {editing ? "Edit account" : "New payment account"}
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Name (shown to users)">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kind">
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="bank">Bank</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="crypto">Crypto</option>
                    <option value="paypal">PayPal</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </Field>
              </div>
              <Field label="Instructions (shown on deposit page)">
                <textarea
                  rows={5}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  placeholder={
                    "Account name: Vendora Ltd\nAccount number: 123456789\nBank: First Bank"
                  }
                  className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Details (JSON, optional)">
                <textarea
                  rows={3}
                  value={form.detailsJson}
                  onChange={(e) => setForm({ ...form, detailsJson: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Sort order">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </Field>
                <Field label="Active">
                  <label className="mt-1 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    Visible to users
                  </label>
                </Field>
              </div>
            </div>

            {/* Live preview — mirrors the user Deposit screen */}
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Eye className="h-3 w-3" /> Live preview — Deposit screen
              </div>
              <AccountPreview
                name={form.name || "Account name"}
                kind={form.kind}
                currency={(form.currency || "USD").toUpperCase()}
                instructions={form.instructions}
                active={form.active}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-background/40"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Saving…" : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function AccountPreview({
  name,
  kind,
  currency,
  instructions,
  active,
}: {
  name: string;
  kind: string;
  currency: string;
  instructions: string;
  active: boolean;
}) {
  const accountFields = (instructions || "")
    .split("\n")
    .map((l) => l.match(/^([^:]+):\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ label: m[1].trim(), value: m[2].trim() }));

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-background/40 p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        How users will see it
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Choose payment account
          </span>
          <div className="mt-1 w-full rounded-xl border border-border bg-background/30 px-3 py-2.5 text-sm">
            {name || "Account name"} — {currency} ({kind})
            {!active && (
              <span className="ml-2 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                Inactive
              </span>
            )}
          </div>
        </label>
        {instructions ? (
          <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground font-sans">
            {instructions}
          </pre>
        ) : (
          <p className="mt-3 text-xs italic text-muted-foreground">No instructions yet.</p>
        )}
        {accountFields.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {accountFields.map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[10px] uppercase text-muted-foreground">{f.label}</div>
                  <div className="text-xs font-semibold truncate">{f.value}</div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
                  <Copy className="h-3 w-3" /> Copy
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
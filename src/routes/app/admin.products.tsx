import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { formatMoney } from "@/data/countries";
import { Plus, Pencil, Trash2, Power, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/products")({
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
  component: AdminProducts,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  daily_earning: number;
  duration_days: number;
  total_return: number;
  risk_level: string;
  active: boolean;
  created_at: string;
};

const blankForm = {
  name: "",
  description: "",
  price: "",
  daily_earning: "",
  duration_days: "",
  total_return: "",
  risk_level: "low" as "low" | "medium" | "high",
};

function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<typeof blankForm>(blankForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Product[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(blankForm);
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setCreating(true);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      daily_earning: String(p.daily_earning),
      duration_days: String(p.duration_days),
      total_return: String(p.total_return),
      risk_level: (p.risk_level as "low" | "medium" | "high") ?? "low",
    });
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      daily_earning: Number(form.daily_earning),
      duration_days: Number(form.duration_days),
      total_return: Number(form.total_return),
      risk_level: form.risk_level,
    };
    if (!payload.name) return toast.error("Name required");
    if (!isFinite(payload.price) || payload.price <= 0) return toast.error("Price must be > 0");
    if (!isFinite(payload.daily_earning) || payload.daily_earning < 0)
      return toast.error("Daily earning invalid");
    if (!isFinite(payload.duration_days) || payload.duration_days <= 0)
      return toast.error("Duration must be > 0");
    if (!isFinite(payload.total_return) || payload.total_return <= 0)
      return toast.error("Total return must be > 0");

    setBusy(true);
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Product updated" : "Product created");
    setCreating(false);
    setEditing(null);
    setForm(blankForm);
    load();
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.active ? "Retired" : "Activated");
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}" permanently?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setItems((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader
        title="Products"
        subtitle={`${items.length} plans`}
        fallbackTo="/app/admin"
        right={
          <button
            onClick={openCreate}
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
          No products yet. Click <span className="font-semibold text-foreground">New</span> to add
          one.
        </div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <article
            key={p.id}
            className={`rounded-2xl border p-4 ${p.active ? "border-border bg-card" : "border-dashed border-muted bg-card/50 opacity-70"}`}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                      p.risk_level === "high"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : p.risk_level === "medium"
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-success/30 bg-success/10 text-success"
                    }`}
                  >
                    {p.risk_level}
                  </span>
                  {!p.active && (
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                      Retired
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{formatMoney(Number(p.price), "USD")}</div>
                <div className="text-[10px] text-muted-foreground">USD</div>
              </div>
            </header>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <Stat label="Daily" value={`+${formatMoney(Number(p.daily_earning), "USD")}`} />
              <Stat label="Duration" value={`${p.duration_days}d`} />
              <Stat label="Total ROI" value={formatMoney(Number(p.total_return), "USD")} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => openEdit(p)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-background/40"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => toggleActive(p)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-background/40"
              >
                <Power className="h-3 w-3" /> {p.active ? "Retire" : "Activate"}
              </button>
              <button
                onClick={() => remove(p)}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => !busy && setCreating(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold">
                {editing ? "Edit product" : "New product"}
              </h3>
              <button
                onClick={() => setCreating(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Description (optional)">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Price (USD)">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </Field>
                <Field label="Duration (days)">
                  <input
                    type="number"
                    value={form.duration_days}
                    onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </Field>
                <Field label="Daily earning (USD)">
                  <input
                    type="number"
                    value={form.daily_earning}
                    onChange={(e) => setForm({ ...form, daily_earning: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </Field>
                <Field label="Total return (USD)">
                  <input
                    type="number"
                    value={form.total_return}
                    onChange={(e) => setForm({ ...form, total_return: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </Field>
              </div>
              <Field label="Risk level">
                <select
                  value={form.risk_level}
                  onChange={(e) =>
                    setForm({ ...form, risk_level: e.target.value as typeof form.risk_level })
                  }
                  className="w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setCreating(false)}
                disabled={busy}
                className="rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-background/40 disabled:opacity-50"
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-foreground">{value}</div>
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

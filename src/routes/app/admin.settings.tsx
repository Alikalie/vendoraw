import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/settings")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles" as never).select("role").eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: Page,
});

type Row = { key: string; value: unknown };
const NUMERIC_KEYS = ["referral_bonus_usd", "commission_percent", "min_withdrawal_usd", "min_deposit_usd"];
const BOOL_KEYS = ["earnings_paused", "signups_disabled"];
const STRING_KEYS = ["base_currency"];

function Page() {
  const [items, setItems] = useState<Record<string, unknown>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("key,value");
      const map: Record<string, unknown> = {}; const d: Record<string, string> = {};
      ((data as Row[]) ?? []).forEach((r) => { map[r.key] = r.value; d[r.key] = String(r.value).replace(/^"|"$/g, ""); });
      setItems(map); setDraft(d); setLoading(false);
    })();
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    let value: unknown = draft[key];
    if (NUMERIC_KEYS.includes(key)) value = Number(draft[key]);
    else if (BOOL_KEYS.includes(key)) value = draft[key] === "true";
    const { error } = await supabase.from("app_settings").upsert([{ key, value: value as never, updated_at: new Date().toISOString() }]);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${key} saved`);
    setItems((p) => ({ ...p, [key]: value }));
  };

  const allKeys = [...NUMERIC_KEYS, ...BOOL_KEYS, ...STRING_KEYS];

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Settings" subtitle="Admin" fallbackTo="/app/admin" />
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="mt-1 text-xs text-muted-foreground">Bonuses, fees, base currency and platform kill-switches.</p>
      {loading ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="mt-4 space-y-3">
          {allKeys.map((k) => {
            const isBool = BOOL_KEYS.includes(k);
            const isNum = NUMERIC_KEYS.includes(k);
            return (
              <div key={k} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold capitalize">{k.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-muted-foreground">current: <span className="font-mono">{JSON.stringify(items[k])}</span></div>
                  </div>
                  <button onClick={() => save(k)} disabled={saving === k}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
                <div className="mt-3">
                  {isBool ? (
                    <select value={draft[k] ?? "false"} onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary">
                      <option value="false">Off</option>
                      <option value="true">On</option>
                    </select>
                  ) : (
                    <input type={isNum ? "number" : "text"} value={draft[k] ?? ""}
                      onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

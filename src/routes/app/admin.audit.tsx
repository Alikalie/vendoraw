import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/admin/audit")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles" as never).select("role").eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: Page,
});

type Row = { id: string; actor_id: string; action: string; target_type: string | null; target_id: string | null; metadata: unknown; created_at: string };

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [actors, setActors] = useState<Record<string, { first_name: string; last_name: string; email: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_audit_log")
        .select("id,actor_id,action,target_type,target_id,metadata,created_at")
        .order("created_at", { ascending: false }).limit(500);
      const list = (data as Row[]) ?? [];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.actor_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id,first_name,last_name,email").in("id", ids);
        const map: Record<string, { first_name: string; last_name: string; email: string | null }> = {};
        (ps ?? []).forEach((p) => { map[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email }; });
        setActors(map);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Audit log" subtitle="Admin" fallbackTo="/app/admin" />
      <h1 className="text-xl font-bold">Audit log</h1>
      <p className="mt-1 text-xs text-muted-foreground">Every admin action with actor, target and metadata.</p>
      <div className="mt-4 space-y-1.5">
        {loading && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…</div>}
        {!loading && rows.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No actions logged yet.</div>}
        {rows.map((r) => {
          const a = actors[r.actor_id];
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold truncate">{r.action}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                by {a ? `${a.first_name} ${a.last_name}` : r.actor_id.slice(0, 8)} · target {r.target_type ?? "—"} {r.target_id ? `(${r.target_id.slice(0, 8)}…)` : ""}
              </div>
              {!!r.metadata && Object.keys(r.metadata as object).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-background/40 p-2 text-[10px] text-muted-foreground">{JSON.stringify(r.metadata, null, 2)}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

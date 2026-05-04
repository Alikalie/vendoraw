import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/data/countries";
import { Loader2, Search, Download } from "lucide-react";

export const Route = createFileRoute("/app/admin/transactions")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles" as never).select("role").eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: Page,
});

type Tx = { id: string; user_id: string; type: string; amount: number; currency: string; status: string; description: string | null; created_at: string };
type Profile = { id: string; first_name: string; last_name: string; email: string | null };

function Page() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [tab, setTab] = useState<"all" | "deposit" | "withdraw" | "buy" | "earning" | "referral">("all");
  const [status, setStatus] = useState<"all" | "pending" | "completed" | "rejected">("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("transactions")
      .select("id,user_id,type,amount,currency,status,description,created_at")
      .order("created_at", { ascending: false }).limit(1000);
    const tx = (data as Tx[]) ?? [];
    setRows(tx);
    const ids = Array.from(new Set(tx.map((r) => r.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,first_name,last_name,email").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps as Profile[] ?? []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-tx-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.type !== tab) return false;
      if (status !== "all" && r.status !== status) return false;
      if (!term) return true;
      const p = profiles[r.user_id];
      return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.email ?? ""} ${r.description ?? ""}`.toLowerCase().includes(term);
    });
  }, [rows, tab, status, q, profiles]);

  const exportCsv = () => {
    const header = ["created_at", "type", "status", "amount", "currency", "user", "email", "description"];
    const lines = filtered.map((r) => {
      const p = profiles[r.user_id];
      return [r.created_at, r.type, r.status, r.amount, r.currency,
        `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim(), p?.email ?? "", (r.description ?? "").replace(/"/g, "'")]
        .map((v) => `"${String(v)}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="All transactions" subtitle="Admin" fallbackTo="/app/admin" />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">All transactions</h1>
        <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-card">
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["all", "deposit", "withdraw", "buy", "earning", "referral"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["all", "pending", "completed", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${status === s ? "border-foreground" : "border-border text-muted-foreground"}`}>{s}</button>
        ))}
      </div>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, email, description…"
          className="w-full rounded-xl border border-border bg-background/30 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{filtered.length} of {rows.length} shown</div>

      <div className="mt-3 space-y-1.5">
        {loading && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…</div>}
        {filtered.map((r) => {
          const p = profiles[r.user_id];
          const credit = r.type === "deposit" || r.type === "earning" || r.type === "referral";
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{p ? `${p.first_name} ${p.last_name}` : r.user_id.slice(0, 8)} <span className="text-[10px] text-muted-foreground capitalize">· {r.type}</span></div>
                <div className="truncate text-[11px] text-muted-foreground">{r.description ?? new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${credit ? "text-success" : ""}`}>{credit ? "+" : "-"}{formatMoney(Number(r.amount), r.currency)}</div>
                <div className={`text-[10px] capitalize ${r.status === "completed" ? "text-success" : r.status === "pending" ? "text-warning" : "text-destructive"}`}>{r.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

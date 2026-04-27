import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { FileText, Save, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/content")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles" as never).select("role").eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    if (!list.some((r) => r.role === "admin" || r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  component: AdminContent,
});

type Page = { id: string; title: string; body: string };
const SEED_IDS = ["support", "privacy", "deposit_instructions"];

function AdminContent() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activeId, setActiveId] = useState<string>("support");
  const [draft, setDraft] = useState<Page>({ id: "support", title: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newId, setNewId] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_content" as never).select("id,title,body").order("id");
    const list = (data as Page[] | null) ?? [];
    // Ensure seed pages always appear, even if empty
    SEED_IDS.forEach((id) => {
      if (!list.find((p) => p.id === id)) list.push({ id, title: id.replace(/_/g, " "), body: "" });
    });
    setPages(list);
    const cur = list.find((p) => p.id === activeId) ?? list[0];
    if (cur) { setActiveId(cur.id); setDraft(cur); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const select = (id: string) => {
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    setActiveId(id); setDraft(p);
  };

  const save = async () => {
    if (!draft.id || !draft.title.trim()) return toast.error("ID and title are required");
    setBusy(true);
    const { error } = await supabase.from("site_content" as never)
      .upsert({ id: draft.id, title: draft.title, body: draft.body, updated_at: new Date().toISOString() } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setPages((prev) => {
      const exists = prev.find((p) => p.id === draft.id);
      return exists ? prev.map((p) => p.id === draft.id ? draft : p) : [...prev, draft];
    });
  };

  const addPage = () => {
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (!id) return toast.error("Enter an ID");
    if (pages.find((p) => p.id === id)) return toast.error("ID already exists");
    const fresh: Page = { id, title: id.replace(/_/g, " "), body: "" };
    setPages([...pages, fresh]);
    setActiveId(id); setDraft(fresh); setNewId("");
  };

  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Site content (CMS)" subtitle="Edit user-facing copy" fallbackTo="/app/admin" />

      {loading ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {pages.map((p) => (
              <button key={p.id} onClick={() => select(p.id)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                  activeId === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}>
                <FileText className="mr-1 inline h-3 w-3" />{p.id}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="new_page_id"
              className="flex-1 rounded-lg border border-border bg-background/30 px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <button onClick={addPage} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background/40">
              <Plus className="h-3 w-3" /> Add page
            </button>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <label className="block">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">ID</span>
              <input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                disabled={SEED_IDS.includes(activeId)}
                className="mt-1 w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60" />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">Title</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background/30 px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">Body (Markdown / plain text)</span>
              <textarea rows={14} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background/30 px-3 py-2 font-mono text-xs outline-none focus:border-primary" />
            </label>
            <button onClick={save} disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
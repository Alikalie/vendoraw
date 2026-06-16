import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScreenHeader } from "@/components/app/ScreenHeader";

export const Route = createFileRoute("/app/admin/audit")({
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
  component: Page,
});

function Page() {
  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Audit log" subtitle="Admin" />
      <h1 className="text-xl font-bold">Audit log</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Every admin action with actor, target and metadata.
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Coming soon — this dashboard is being built out.
      </div>
    </div>
  );
}

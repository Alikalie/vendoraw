import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import {
  ShieldCheck, Users, Package, FileText, ArrowDownToLine, ArrowUpFromLine, Crown,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", data.user.id);
    const list = (roles as { role: string }[] | null) ?? [];
    const isAdmin = list.some((r) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw redirect({ to: "/app" });
  },
  component: AdminHome,
});

function AdminHome() {
  const { isSuperAdmin } = useAuth();
  const cards: { to: string; title: string; desc: string; icon: typeof Users; superOnly?: boolean }[] = [
    { to: "/app/admin/users", title: "Users", desc: "Search, block, credit balance, promote", icon: Users },
    { to: "/app/admin/products", title: "Products", desc: "Create, edit & retire investment plans", icon: Package },
    { to: "/app/admin/deposits", title: "Deposits", desc: "Approve or reject pending deposits", icon: ArrowDownToLine },
    { to: "/app/admin/withdrawals", title: "Withdrawals", desc: "Bulk approve or reject payouts", icon: ArrowUpFromLine },
    { to: "/app/admin/content", title: "Site content (CMS)", desc: "Edit Help, Privacy & deposit instructions", icon: FileText },
  ];
  return (
    <div className="px-5 pt-2 pb-8">
      <ScreenHeader title="Admin dashboard" subtitle="Manage Vendora" />
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <ShieldCheck className="h-3 w-3" /> Admin console
        </div>
        {isSuperAdmin && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
            <Crown className="h-3 w-3" /> Super-admin
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to as "/app/admin/users"}
              className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.desc}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
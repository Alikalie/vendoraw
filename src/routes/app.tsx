import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { MobileShell } from "@/components/app/MobileShell";
import { BottomTabs } from "@/components/app/BottomTabs";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  if (loading) {
    return (
      <MobileShell>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </MobileShell>
    );
  }
  if (!user) return null;

  return (
    <MobileShell>
      <div className="flex-1 overflow-y-auto pb-2">
        <Outlet />
      </div>
      <BottomTabs />
    </MobileShell>
  );
}

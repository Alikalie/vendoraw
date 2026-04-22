import { Link, useLocation } from "@tanstack/react-router";
import { Home, Store, Receipt, Tag, User } from "lucide-react";

const tabs: ReadonlyArray<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/market", label: "Market", icon: Store },
  { to: "/app/transactions", label: "Activity", icon: Receipt },
  { to: "/app/sells", label: "Sells", icon: Tag },
  { to: "/app/profile", label: "Profile", icon: User },
];

export function BottomTabs() {
  const loc = useLocation();
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to as "/app"}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
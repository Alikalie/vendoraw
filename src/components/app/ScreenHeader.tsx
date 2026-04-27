import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Consistent header with back arrow for all authenticated screens.
 * Falls back to `fallbackTo` when there's no history (e.g. deep link).
 */
export function ScreenHeader({
  title,
  subtitle,
  fallbackTo = "/app",
  right,
}: {
  title?: string;
  subtitle?: string;
  fallbackTo?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: fallbackTo });
    }
  };
  return (
    <div className="sticky top-0 z-20 -mx-5 mb-4 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-3 backdrop-blur-md">
      <button
        onClick={goBack}
        aria-label="Go back"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        {title && <div className="truncate text-sm font-semibold">{title}</div>}
        {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {right}
      {!title && (
        <Link to="/app" className="text-[11px] text-muted-foreground hover:text-foreground">Home</Link>
      )}
    </div>
  );
}
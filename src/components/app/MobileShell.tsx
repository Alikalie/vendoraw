import { type ReactNode } from "react";

/**
 * Phone-style centered viewport for the authenticated app.
 * On desktop: fixed-width "device" with rounded frame.
 * On mobile: edge-to-edge full screen.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex justify-center md:p-6">
      <div className="w-full md:max-w-[440px] md:rounded-[2rem] md:border md:border-border md:overflow-hidden md:shadow-[var(--shadow-card)] bg-background relative flex flex-col min-h-screen md:min-h-[860px] md:max-h-[860px]">
        {children}
      </div>
    </div>
  );
}
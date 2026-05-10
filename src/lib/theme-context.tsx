import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type Theme = "light" | "dark";
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "vendora-theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("dark");

  // initial load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  // sync with profile preference once available
  useEffect(() => {
    if (!profile?.theme) return;
    const t = profile.theme === "light" ? "light" : "dark";
    setThemeState(t);
    applyTheme(t);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, t);
  }, [profile?.theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, t);
    if (user) {
      supabase
        .from("profiles")
        .update({ theme: t })
        .eq("id", user.id)
        .then(() => {});
    }
  };

  return (
    <ThemeCtx.Provider
      value={{ theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark"), setTheme }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}

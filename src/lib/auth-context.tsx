import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { loadRates } from "@/lib/fx";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  country_code: string;
  currency: string;
  contact: string | null;
  email: string | null;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  referral_code: string;
  referred_by: string | null;
  is_blocked: boolean;
  profile_locked: boolean;
  currency_locked_until: string;
  total_invested: number;
  theme: string;
};

type Ctx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
    const { data: roles } = await supabase
      .from("user_roles" as never)
      .select("role")
      .eq("user_id", uid);
    const list = (roles as { role: string }[] | null) ?? [];
    const sa = list.some((r) => r.role === "super_admin");
    setIsSuperAdmin(sa);
    setIsAdmin(sa || list.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    // Hydrate FX rates once; safe to call repeatedly (idempotent cache).
    loadRates().catch(() => { /* fall back to static rates */ });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Live updates to my own profile row (balance, totals)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`me-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, session, profile, isAdmin, isSuperAdmin, loading, refreshProfile, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
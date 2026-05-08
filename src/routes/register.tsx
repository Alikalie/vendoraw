import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Vendora" },
      { name: "description", content: "Open your Vendora wallet in your local currency." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const nav = useNavigate();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [countryName, setCountryName] = useState("United States");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? params.get("ref");
    if (code) setReferral(code.toUpperCase());
  }, []);

  const country = useMemo(() => countries.find((c) => c.name === countryName)!, [countryName]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          first_name: first,
          last_name: last,
          country: country.name,
          country_code: country.dial,
          currency: country.currency,
          contact: `${country.dial} ${contact}`.trim(),
          referral_code: referral.trim().toUpperCase(),
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — welcome to Vendora!");
    nav({ to: "/app" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg" style={{ background: "var(--gradient-primary)" }} />
          <span className="text-xl font-bold">Vendora</span>
        </Link>
        <h1 className="text-2xl font-bold">Create your wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your wallet currency is set automatically from your country.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input required value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} /></Field>
            <Field label="Last name"><input required value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} /></Field>
          </div>

          <Field label="Country">
            <select value={countryName} onChange={(e) => setCountryName(e.target.value)} className={inputCls}>
              {countries.map((c) => (
                <option key={c.code} value={c.name}>{c.name} ({c.currency})</option>
              ))}
            </select>
          </Field>

          <Field label="Contact">
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground">{country.dial}</span>
              <input required value={contact} onChange={(e) => setContact(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Phone number" className={inputCls} />
            </div>
          </Field>

          <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>

          <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            Investment currency: <span className="font-semibold text-foreground">{country.currency}</span>
          </div>

          <Field label="Promo code (optional)">
            <input
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder="Affiliate promo code"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Got a promo code from a Vendora affiliate? Enter it here.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Password"><input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></Field>
            <Field label="Confirm"><input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} /></Field>
          </div>

          <button disabled={loading} className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            By creating an account you agree to Vendora's terms and privacy policy.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, TrendingUp, Wallet, Repeat, Users, Menu, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vendora — Trade, Earn & Resell" },
      {
        name: "description",
        content:
          "Vendora is a global trading & investment marketplace. Deposit, buy products, earn daily returns, resell to peers, or withdraw.",
      },
      { property: "og:title", content: "Vendora — Trade, Earn & Resell" },
      { property: "og:description", content: "Global trading & investment marketplace." },
    ],
  }),
  component: Index,
});

function Index() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg" style={{ background: "var(--gradient-primary)" }} />
            <span className="text-lg font-bold tracking-tight">Vendora</span>
          </Link>
          <nav className="hidden items-center gap-2 sm:flex">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
          <button
            type="button"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => setNavOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground sm:hidden"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {navOpen && (
          <div className="border-t border-border bg-background/95 px-5 py-3 sm:hidden">
            <Link
              to="/login"
              onClick={() => setNavOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setNavOpen(false)}
              className="mt-1 block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            background: "radial-gradient(60% 60% at 50% 0%, var(--primary) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-24 text-center md:pt-24">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Trade, earn & resell —{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              all in one wallet
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Vendora is a global marketplace where you deposit, purchase products as positions, earn
            daily returns, and resell early to peers for liquidity.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
            >
              Create your wallet <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-card"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">How it works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              icon: Wallet,
              title: "Deposit",
              text: "Fund your Vendora wallet in your local currency.",
            },
            {
              icon: TrendingUp,
              title: "Buy a product",
              text: "Pick from curated bundles with clear ROI & duration.",
            },
            {
              icon: Repeat,
              title: "Earn or resell",
              text: "Accrue daily returns or resell early.",
            },
            {
              icon: Users,
              title: "Refer & earn",
              text: "Apply for a code after 10 completed investments.",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-2xl border border-border p-6"
                style={{ background: "var(--gradient-card)" }}
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vendora
      </footer>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Wrench } from "lucide-react";

export const Route = createFileRoute("/app/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const nav = useNavigate();
  return (
    <div className="px-5 pt-6 pb-8">
      <button onClick={() => nav({ to: "/app/profile" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </button>
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
        <Wrench className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-lg font-semibold">Deposit flow</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The full deposit flow (amount, payment instructions, account-number copy, proof upload, admin approval)
          is being set up. The storage bucket and database fields are ready — the UI lands in the next update.
        </p>
        <button onClick={() => nav({ to: "/app" })} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Return home
        </button>
      </div>
    </div>
  );
}

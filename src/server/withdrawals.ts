import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const withdrawSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  methodId: z.string().uuid(),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => withdrawSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify method belongs to user
    const { data: method, error: mErr } = await supabase
      .from("withdrawal_methods")
      .select("id, kind, label")
      .eq("id", data.methodId)
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr || !method) throw new Error("Withdrawal method not found");

    // Load profile (RLS scoped to self)
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("balance, total_withdrawn, currency")
      .eq("id", userId)
      .maybeSingle();
    if (pErr || !profile) throw new Error("Profile not found");
    if (Number(profile.balance) < data.amount) throw new Error("Insufficient balance");

    const newBalance = Number(profile.balance) - data.amount;
    const newWithdrawn = Number(profile.total_withdrawn) + data.amount;

    const { error: uErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance, total_withdrawn: newWithdrawn })
      .eq("id", userId);
    if (uErr) throw new Error(uErr.message);

    const { error: tErr } = await supabase.from("transactions").insert({
      user_id: userId,
      type: "withdraw",
      amount: data.amount,
      currency: profile.currency,
      status: "pending",
      description: `Withdraw to ${method.label} (${method.kind.replace("_", " ")})`,
      method_id: method.id,
    });
    if (tErr) throw new Error(tErr.message);

    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requestSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  methodId: z.string().uuid().optional(),
  proofPath: z.string().min(1).max(500),
  note: z.string().max(500).optional(),
});

export const requestDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("currency, is_blocked")
      .eq("id", userId)
      .maybeSingle();
    if (pErr || !profile) throw new Error("Profile not found");
    if (profile.is_blocked) throw new Error("Account is blocked");

    let methodLabel = "Manual transfer";
    if (data.methodId) {
      const { data: method } = await supabase
        .from("withdrawal_methods")
        .select("kind, label")
        .eq("id", data.methodId)
        .eq("user_id", userId)
        .maybeSingle();
      if (method) methodLabel = `${method.label} (${method.kind.replace("_", " ")})`;
    }

    const { data: tx, error: tErr } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: data.amount,
        currency: profile.currency,
        status: "pending",
        description: `Deposit via ${methodLabel}`,
        method_id: data.methodId ?? null,
        proof_path: data.proofPath,
        notes: data.note ?? null,
      })
      .select("id")
      .single();
    if (tErr || !tx) throw new Error(tErr?.message ?? "Could not create deposit");

    return { ok: true, id: tx.id };
  });

const moderateSchema = z.object({
  txId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

// Admin-only: approve credits the user's wallet & total_invested; reject just marks rejected.
export const moderateDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moderateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { data: tx, error: tErr } = await supabase
      .from("transactions")
      .select("id,user_id,amount,currency,status,type")
      .eq("id", data.txId)
      .maybeSingle();
    if (tErr || !tx) throw new Error("Deposit not found");
    if (tx.type !== "deposit") throw new Error("Not a deposit");
    if (tx.status !== "pending") throw new Error(`Already ${tx.status}`);

    if (data.action === "reject") {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "rejected", notes: data.notes ?? null })
        .eq("id", tx.id)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // approve: credit balance + total_invested atomically (best-effort sequential)
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("balance,total_invested,referred_by,currency")
      .eq("id", tx.user_id)
      .maybeSingle();
    if (pErr || !prof) throw new Error("User profile not found");

    const newBalance = Number(prof.balance) + Number(tx.amount);
    const newInvested = Number(prof.total_invested) + Number(tx.amount);

    // Mark completed first using optimistic guard, then update profile.
    const { error: uTxErr } = await supabase
      .from("transactions")
      .update({ status: "completed", notes: data.notes ?? null })
      .eq("id", tx.id)
      .eq("status", "pending");
    if (uTxErr) throw new Error(uTxErr.message);

    const { error: uPErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance, total_invested: newInvested })
      .eq("id", tx.user_id);
    if (uPErr) throw new Error(uPErr.message);

    // Affiliate commission: credit the referrer (if any) a % of this deposit
    let commission = 0;
    if (prof.referred_by) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "affiliate_commission_rate")
        .maybeSingle();
      const rate = Number((setting?.value as unknown) ?? 0.05);
      commission = Number(tx.amount) * rate;
      if (commission > 0) {
        const { data: aff } = await supabase
          .from("profiles")
          .select("balance,total_earned,currency")
          .eq("id", prof.referred_by)
          .maybeSingle();
        if (aff) {
          await supabase
            .from("profiles")
            .update({
              balance: Number(aff.balance) + commission,
              total_earned: Number(aff.total_earned) + commission,
            })
            .eq("id", prof.referred_by);
          await supabase.from("transactions").insert({
            user_id: prof.referred_by,
            type: "referral",
            amount: commission,
            currency: aff.currency,
            status: "completed",
            description: `Affiliate commission (${(rate * 100).toFixed(1)}% of deposit)`,
          });
          await supabase.from("notifications").insert({
            user_id: prof.referred_by,
            title: "Affiliate commission earned 💰",
            body: `You earned ${commission.toFixed(2)} ${aff.currency} from a referred user's deposit.`,
            kind: "success",
          });
        }
      }
    }

    return { ok: true, credited: Number(tx.amount), commission };
  });

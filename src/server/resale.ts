import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const buySchema = z.object({ listingId: z.string().uuid() });

export const buyResaleListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => buySchema.parse(input))
  .handler(async ({ data, context }) => {
    const buyerId = context.userId;
    const { listingId } = data;

    // Load the listing (must still be open)
    const { data: listing, error: lErr } = await supabaseAdmin
      .from("resale_listings")
      .select("id, investment_id, seller_id, price, status")
      .eq("id", listingId)
      .maybeSingle();
    if (lErr || !listing) throw new Error("Listing not found");
    if (listing.status !== "open") throw new Error("Listing is no longer available");
    if (listing.seller_id === buyerId) throw new Error("You can't buy your own listing");

    // Load buyer + seller profiles
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, balance, currency, total_earned")
      .in("id", [buyerId, listing.seller_id]);
    if (pErr || !profiles || profiles.length < 2) throw new Error("Account lookup failed");
    const buyer = profiles.find((p) => p.id === buyerId)!;
    const seller = profiles.find((p) => p.id === listing.seller_id)!;
    if (Number(buyer.balance) < Number(listing.price)) throw new Error("Insufficient balance");

    // Atomic-ish update: mark listing sold first using optimistic check on status
    const { data: claimed, error: cErr } = await supabaseAdmin
      .from("resale_listings")
      .update({ status: "sold", buyer_id: buyerId, sold_at: new Date().toISOString() })
      .eq("id", listingId)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (cErr || !claimed) throw new Error("Listing was just taken by someone else");

    // Transfer investment ownership
    const { error: invErr } = await supabaseAdmin
      .from("investments")
      .update({ user_id: buyerId })
      .eq("id", listing.investment_id);
    if (invErr) throw new Error("Failed to transfer investment");

    // Debit buyer, credit seller
    const price = Number(listing.price);
    await supabaseAdmin
      .from("profiles")
      .update({ balance: Number(buyer.balance) - price })
      .eq("id", buyer.id);
    await supabaseAdmin
      .from("profiles")
      .update({
        balance: Number(seller.balance) + price,
        total_earned: Number(seller.total_earned) + Math.max(0, price), // treat resale as earnings
      })
      .eq("id", seller.id);

    // Record both transactions
    await supabaseAdmin.from("transactions").insert([
      {
        user_id: buyer.id,
        type: "resale_buy",
        amount: price,
        currency: buyer.currency,
        description: "Resale purchase",
      },
      {
        user_id: seller.id,
        type: "resale_sell",
        amount: price,
        currency: seller.currency,
        description: "Resale sold",
      },
    ]);

    return { ok: true };
  });

const cancelSchema = z.object({ listingId: z.string().uuid() });

export const cancelResaleListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("resale_listings")
      .update({ status: "cancelled" })
      .eq("id", data.listingId)
      .eq("seller_id", context.userId)
      .eq("status", "open");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

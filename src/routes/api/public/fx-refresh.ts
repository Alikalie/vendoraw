import { createFileRoute } from "@tanstack/react-router";
import { refreshExchangeRates } from "@/server/fx";

/**
 * Public endpoint for cron / external schedulers to refresh FX rates.
 * GET or POST both supported. No PII returned.
 */
export const Route = createFileRoute("/api/public/fx-refresh")({
  server: {
    handlers: {
      GET: async () => {
        const res = await refreshExchangeRates();
        return new Response(JSON.stringify(res), {
          status: res.ok ? 200 : 502,
          headers: { "content-type": "application/json" },
        });
      },
      POST: async () => {
        const res = await refreshExchangeRates();
        return new Response(JSON.stringify(res), {
          status: res.ok ? 200 : 502,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});

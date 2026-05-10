import { createFileRoute } from "@tanstack/react-router";
import { refreshExchangeRates } from "@/server/fx";

/**
 * Public endpoint for cron / external schedulers to refresh FX rates.
 * Requires the FX_REFRESH_SECRET shared secret (header `x-cron-secret` or
 * `?key=` query param). Without a configured secret the endpoint is disabled.
 */
function authorize(request: Request): boolean {
  const secret = process.env.FX_REFRESH_SECRET;
  if (!secret) return false;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("key");
  return provided === secret;
}

function deny() {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/fx-refresh")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorize(request)) return deny();
        const res = await refreshExchangeRates();
        return new Response(JSON.stringify(res), {
          status: res.ok ? 200 : 502,
          headers: { "content-type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        if (!authorize(request)) return deny();
        const res = await refreshExchangeRates();
        return new Response(JSON.stringify(res), {
          status: res.ok ? 200 : 502,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});

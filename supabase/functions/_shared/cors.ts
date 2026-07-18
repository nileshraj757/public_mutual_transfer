// Shared CORS headers. The mobile app runs on a Capacitor origin
// (https://localhost / capacitor://localhost) which is cross-origin to the
// Supabase Functions host, so every response must be CORS-enabled.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Standard OK/err JSON responses with CORS applied. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

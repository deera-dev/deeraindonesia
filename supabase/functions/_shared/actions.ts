import { corsHeaders, handlePreflight } from "./cors.ts";

export type ActionContext<TClient> = {
  supabase: TClient;
  req: Request;
};

export type ActionHandler<TClient, TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: ActionContext<TClient>,
) => Promise<TOutput> | TOutput;

export type ActionMap<TClient> = Record<string, ActionHandler<TClient>>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Builds a Deno.serve-compatible handler that dispatches a {action, input}
 * POST body to one of `actions`. Every Edge Function in this repo that
 * fronts more than one operation should be shaped this way (one function,
 * several actions) rather than one function per operation.
 */
export function createActionHandler<TClient>(
  actions: ActionMap<TClient>,
  getClient: (req: Request) => TClient,
) {
  return async (req: Request): Promise<Response> => {
    const preflight = handlePreflight(req);
    if (preflight) return preflight;

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body: { action?: string; input?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { action, input } = body;
    if (!action || typeof action !== "string") {
      return jsonResponse({ error: "Missing `action`" }, 400);
    }

    const handler = actions[action];
    if (!handler) {
      return jsonResponse({ error: `Unknown action: ${action}` }, 404);
    }

    try {
      const supabase = getClient(req);
      const result = await handler(input, { supabase, req });
      return jsonResponse({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return jsonResponse({ error: message }, 400);
    }
  };
}

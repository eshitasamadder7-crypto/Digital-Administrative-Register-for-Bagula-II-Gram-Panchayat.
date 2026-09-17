import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Builds a Supabase client that acts as the signed-in MCP user so RLS applies.
 * Never called at module load — only inside tool handlers.
 */
export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated. Sign in to this app first." }],
    isError: true,
  };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

export const CERT_TABLES = {
  warish: "warish_certificates",
  dependent: "dependent_certificates",
} as const;

export const LIST_COLUMNS =
  "id, status, applicant_name, village, memo_no, certificate_number, verification_id, verification_status, issue_date, rejection_reason, created_at, updated_at";

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  CERT_TABLES,
  LIST_COLUMNS,
  errorResult,
  jsonResult,
  supabaseForUser,
  unauthenticated,
} from "../supabaseClient";

export default defineTool({
  name: "search_certificates",
  title: "Search certificate applications",
  description:
    "Search Warish and Dependent applications by applicant name, village, memo number, certificate number, or verification id.",
  inputSchema: {
    query: z.string().describe("Free text to match against name, village, memo or certificate number."),
    limit: z.number().int().optional().describe("Max rows per register (default 10, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 10, 1), 50);
    const term = query.trim().slice(0, 100);
    if (!term) return errorResult("Search query is empty.");
    // Strip PostgREST filter-structural characters so the search text cannot
    // alter the filter grammar, then quote the value.
    const safe = term.replace(/[,.()"\\*]/g, " ").replace(/\s+/g, " ").trim();
    if (!safe) return errorResult("Search query contains no searchable characters.");
    const like = `"%${safe}%"`;
    const filter = [
      `applicant_name.ilike.${like}`,
      `village.ilike.${like}`,
      `memo_no.ilike.${like}`,
      `certificate_number.ilike.${like}`,
      `verification_id.ilike.${like}`,
    ].join(",");

    const supabase = supabaseForUser(ctx);
    const results: Record<string, unknown> = {};
    for (const [kind, table] of Object.entries(CERT_TABLES)) {
      const { data, error } = await supabase
        .from(table)
        .select(LIST_COLUMNS)
        .or(filter)
        .order("updated_at", { ascending: false })
        .limit(take);
      if (error) return errorResult(`${kind}: ${error.message}`);
      results[kind] = data ?? [];
    }

    return jsonResult({ query: term, results });
  },
});

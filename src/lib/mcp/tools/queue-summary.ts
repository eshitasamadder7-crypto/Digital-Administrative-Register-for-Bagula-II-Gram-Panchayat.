import { defineTool } from "@lovable.dev/mcp-js";
import {
  CERT_TABLES,
  errorResult,
  jsonResult,
  supabaseForUser,
  unauthenticated,
} from "../supabaseClient";

const STATUSES = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Issued"];

export default defineTool({
  name: "queue_summary",
  title: "Certificate queue summary",
  description:
    "Live counts of Warish and Dependent applications by workflow status, plus items returned for modification.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const summary: Record<string, Record<string, number>> = {};
    for (const [kind, table] of Object.entries(CERT_TABLES)) {
      const counts: Record<string, number> = {};
      for (const status of STATUSES) {
        const { count, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        if (error) return errorResult(`${kind}: ${error.message}`);
        counts[status] = count ?? 0;
      }
      const { count: returned, error: returnedError } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .like("rejection_reason", "[RETURN]%");
      if (returnedError) return errorResult(`${kind}: ${returnedError.message}`);
      counts["Returned for modification"] = returned ?? 0;
      summary[kind] = counts;
    }

    return jsonResult(summary);
  },
});

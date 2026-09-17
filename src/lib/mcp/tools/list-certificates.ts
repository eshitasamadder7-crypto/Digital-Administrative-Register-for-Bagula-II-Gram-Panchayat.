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
  name: "list_certificates",
  title: "List certificate applications",
  description:
    "List Warish or Dependent certificate applications visible to the signed-in officer, optionally filtered by status.",
  inputSchema: {
    kind: z.enum(["warish", "dependent"]).describe("Certificate register to read."),
    status: z
      .string()
      .optional()
      .describe("Optional exact status filter, e.g. Draft, Submitted, Approved, Rejected, Issued."),
    limit: z.number().int().optional().describe("Max rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 20, 1), 100);

    let query = supabaseForUser(ctx)
      .from(CERT_TABLES[kind])
      .select(LIST_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(take);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ kind, count: data?.length ?? 0, rows: data ?? [] });
  },
});

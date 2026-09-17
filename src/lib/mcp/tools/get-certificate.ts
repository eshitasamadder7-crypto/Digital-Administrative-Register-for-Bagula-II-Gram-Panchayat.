import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  CERT_TABLES,
  errorResult,
  jsonResult,
  supabaseForUser,
  unauthenticated,
} from "../supabaseClient";

export default defineTool({
  name: "get_certificate",
  title: "Get a certificate application",
  description:
    "Fetch the full record of one Warish or Dependent certificate application, including its audit trail.",
  inputSchema: {
    kind: z.enum(["warish", "dependent"]).describe("Certificate register to read."),
    id: z.string().describe("Application id (uuid)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from(CERT_TABLES[kind])
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("No application found with that id (or access is not permitted).");

    const { data: audit } = await supabase
      .from("certificate_audit_logs")
      .select("*")
      .eq("cert_id", id)
      .order("created_at", { ascending: true });

    return jsonResult({ kind, application: data, audit: audit ?? [] });
  },
});

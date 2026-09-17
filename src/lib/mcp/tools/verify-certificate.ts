import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabaseClient";

export default defineTool({
  name: "verify_certificate",
  title: "Verify a certificate",
  description:
    "Verify an issued certificate by its public verification id, using the same check as the public verification page.",
  inputSchema: {
    verification_id: z.string().describe("Verification id printed on the certificate / QR code."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ verification_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx).rpc("public_verify", {
      _verification_id: verification_id.trim(),
      _ip_hash: "mcp",
    });
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});

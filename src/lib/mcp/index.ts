import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCertificates from "./tools/list-certificates";
import getCertificate from "./tools/get-certificate";
import searchCertificates from "./tools/search-certificates";
import queueSummary from "./tools/queue-summary";
import verifyCertificate from "./tools/verify-certificate";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bagula-gp-dar-mcp",
  title: "Bagula GP DAR",
  version: "0.1.0",
  instructions:
    "Read-only tools over the Bagula II Gram Panchayat Digital Administrative Register. Use queue_summary for workload counts, list_certificates and search_certificates to find Warish/Dependent applications, get_certificate for full details plus audit trail, and verify_certificate to check an issued certificate by verification id. All access runs as the signed-in officer under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [queueSummary, listCertificates, searchCertificates, getCertificate, verifyCertificate],
});

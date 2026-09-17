import { supabase } from "@/integrations/supabase/client";

/** Placeholder wrapper over the existing public_verify RPC. */
export const qrEngine = {
  async verify(verificationId: string, ipHash: string) {
    return supabase.rpc("public_verify", { _verification_id: verificationId, _ip_hash: ipHash });
  },
};
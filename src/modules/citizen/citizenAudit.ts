import { supabase } from "@/integrations/supabase/client";

/** Citizen-side audit trail. Mirrors the office `logActivity` helper. */
export async function logCitizenActivity(input: {
  action_type: string;
  target_table?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
  citizen_id?: string | null;
}) {
  try {
    // Citizen activity is written by a trusted server-side routine which pins
    // the user id / citizen id and validates the action name.
    await supabase.rpc("log_citizen_activity", {
      _action_type: input.action_type,
      _target_table: input.target_table ?? null,
      _target_id: input.target_id ?? null,
      _metadata: (input.metadata ?? {}) as never,
    });
  } catch (err) {
    console.warn("logCitizenActivity failed", err);
  }
}

import { supabase } from "@/integrations/supabase/client";

export interface ActivityLogInput {
  action_type: string;
  target_table?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: ActivityLogInput) {
  try {
    // Logging goes through a trusted server-side routine: the actor is pinned
    // to the signed-in user and the action name is validated server-side.
    await supabase.rpc("log_office_activity", {
      _action_type: input.action_type,
      _target_table: input.target_table ?? null,
      _target_id: input.target_id ?? null,
      _metadata: (input.metadata ?? {}) as never,
    });
  } catch (err) {
    // Don't break flows if logging fails
    console.warn("logActivity failed", err);
  }
}

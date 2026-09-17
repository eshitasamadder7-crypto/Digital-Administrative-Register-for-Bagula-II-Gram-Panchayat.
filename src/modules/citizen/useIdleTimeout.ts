import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Inactivity window for citizen sessions (test configuration). */
export const CITIZEN_IDLE_MS = 3 * 60 * 1000;

const EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click", "visibilitychange"];

/**
 * Signs the citizen out after 3 minutes of inactivity.
 * The timer resets on every user action.
 */
export function useIdleTimeout(enabled: boolean) {
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const signOut = async () => {
      await supabase.auth.signOut();
      toast({
        title: "Signed out for your safety",
        description: "নিরাপত্তার জন্য আপনাকে সাইন আউট করা হয়েছে — please sign in again.",
      });
      navigate("/public/login", { replace: true });
    };

    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(signOut, CITIZEN_IDLE_MS);
    };

    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, navigate]);
}

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCitizenSession } from "./useCitizenSession";
import { useIdleTimeout } from "./useIdleTimeout";

/** Guards citizen-only routes and enforces the idle session timeout. */
export default function RequireCitizen({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useCitizenSession();
  const location = useLocation();
  useIdleTimeout(Boolean(session));

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/public/login" replace state={{ from: location.pathname }} />;
  }

  // A signed-in office user is not a citizen — send them to their own portal.
  if (!loading && session && profile === null) {
    return <Navigate to="/public/login" replace />;
  }

  return <>{children}</>;
}

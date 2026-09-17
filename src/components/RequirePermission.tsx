import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthz, hasPermission, hasServiceScope, type AppPermission, type AppAction } from "@/lib/permissions";

interface Props {
  permission: AppPermission;
  action?: AppAction;
  superAdminOnly?: boolean;
  children: ReactNode;
}

export default function RequirePermission({ permission, action = "view", superAdminOnly, children }: Props) {
  const authz = useAuthz();

  if (authz.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking permissions…
      </div>
    );
  }

  let allowed = superAdminOnly ? authz.isSuperAdmin : hasPermission(authz, permission, action);

  if (allowed && authz.role === "deo") {
     if (permission === "warish_certs") allowed = hasServiceScope({ role: authz.role, serviceScope: authz.serviceScope }, "warish");
     if (permission === "dependent_certs") allowed = hasServiceScope({ role: authz.role, serviceScope: authz.serviceScope }, "dependent");
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-base font-semibold">Access denied</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You don't have the <code>{permission}:{action}</code> permission
          {superAdminOnly ? " (Super Admin required)" : ""}. Ask a Super Admin to grant it.
        </p>
        <Link to="/admin/dashboard" className="text-xs underline text-muted-foreground">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

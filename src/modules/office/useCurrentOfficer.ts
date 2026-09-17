// Day 1: unified officer profile hook.
// Reads designation + system_role from admin_profiles alongside the legacy
// role/permission state from useAuthz(). Legacy checks stay authoritative;
// this hook is additive.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthz } from "@/lib/permissions";
import type {
  OfficeDesignation,
  SystemRole,
} from "@/modules/office/permissions";

export interface CurrentOfficer {
  loading: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  designation: OfficeDesignation | null;
  systemRole: SystemRole | null;
  officeId: string | null;
  // Legacy passthroughs — components can migrate away gradually.
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isDeo: boolean;
}

const initial: CurrentOfficer = {
  loading: true,
  userId: null,
  email: null,
  displayName: null,
  designation: null,
  systemRole: null,
  officeId: null,
  isSuperAdmin: false,
  isAdmin: false,
  isDeo: false,
};

export function useCurrentOfficer(): CurrentOfficer {
  const authz = useAuthz();
  const [profile, setProfile] = useState<{
    displayName: string | null;
    designation: OfficeDesignation | null;
    systemRole: SystemRole | null;
    officeId: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!authz.userId) {
      setProfile(null);
      return;
    }
    (async () => {
      let rowData: any = null;
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("display_name, designation, designation_code, system_role, office_id")
        .eq("user_id", authz.userId)
        .maybeSingle();
      if (!error && data) {
        rowData = data;
      } else {
        const { data: fallbackData } = await supabase
          .from("admin_profiles")
          .select("display_name, designation_code, system_role, office_id")
          .eq("user_id", authz.userId)
          .maybeSingle();
        rowData = fallbackData;
      }
      if (!active) return;
      const des = (rowData?.designation ?? rowData?.designation_code ?? null) as OfficeDesignation | null;
      setProfile({
        displayName: rowData?.display_name ?? null,
        designation: des,
        systemRole: (rowData?.system_role ?? null) as SystemRole | null,
        officeId: rowData?.office_id ?? null,
      });
    })();
    return () => {
      active = false;
    };
  }, [authz.userId]);

  if (authz.loading || (authz.userId && profile === null)) {
    return { ...initial, loading: true };
  }

  return {
    loading: false,
    userId: authz.userId,
    email: authz.email,
    displayName: profile?.displayName ?? null,
    designation: profile?.designation ?? null,
    systemRole: profile?.systemRole ?? null,
    officeId: profile?.officeId ?? null,
    isSuperAdmin: authz.isSuperAdmin,
    isAdmin: authz.isAdmin,
    isDeo: authz.isDeo,
  };
}

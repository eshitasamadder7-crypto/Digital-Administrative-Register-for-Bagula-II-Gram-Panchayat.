import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  REDIRECT_GUIDES,
  type RedirectGuide,
  type WorkflowStep,
  type DocumentRequired,
  type VideoGuide,
} from "@/data/redirectGuides";
import { logActivity } from "@/lib/activityLog";

const STORAGE_KEY = "bagula_sop_master_guides_cache_v1";
const EVENT_NAME = "bagula_master_service_guides_updated";

// In-memory runtime cache pre-seeded with static REDIRECT_GUIDES
let memoryCache: Record<string, RedirectGuide> = { ...REDIRECT_GUIDES };

// Initialize from local cache if present
try {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (typeof parsed === "object" && parsed !== null) {
      memoryCache = { ...REDIRECT_GUIDES, ...parsed };
    }
  }
} catch {
  // Ignore localStorage read errors
}

/** Extract YouTube 11-char ID from any URL or ID format */
export function extractYouTubeId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const urlMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return "";
}

/** Convert database row to typed RedirectGuide */
function rowToGuide(row: any): RedirectGuide {
  return {
    id: row.service_id,
    slug: row.slug || row.service_id,
    title: row.title || row.service_id,
    bengaliTitle: row.bengali_title || "",
    category: row.category || "General",
    categoryId: row.category_id || undefined,
    displayOrder: typeof row.display_order === "number" ? row.display_order : undefined,
    portalName: row.portal_name || "Bagula II GP Portal",
    portalUrl: row.portal_url || "#",
    destinationType: row.destination_type || undefined,
    officialDept: row.official_dept || "Bagula II Gram Panchayat",
    description: row.description || "",
    bengaliDescription: row.bengali_description || "",
    regulatoryInfo: row.regulatory_info || "",
    turnaroundTime: row.turnaround_time || "7-15 working days",
    validity: row.validity || "",
    feeInfo: row.fee_info || "",
    eligibility: Array.isArray(row.eligibility) ? row.eligibility : undefined,
    purposes: Array.isArray(row.purposes) ? row.purposes : undefined,
    workflow: Array.isArray(row.workflow) ? row.workflow : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    faqs: Array.isArray(row.faqs) ? row.faqs : undefined,
    downloadFormUrl: row.download_form_url || undefined,
    downloadFormLabel: row.download_form_label || undefined,
    videoGuide: row.video_guide && typeof row.video_guide === "object" ? row.video_guide : undefined,
    localOfficeNotice: row.local_office_notice || undefined,
  };
}

/** Fetch all service guides from Supabase master_service_guides table */
export async function syncMasterServiceGuides(): Promise<Record<string, RedirectGuide>> {
  try {
    const { data, error } = await supabase
      .from("master_service_guides" as any)
      .select("*")
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return memoryCache;
    }

    const updated: Record<string, RedirectGuide> = { ...memoryCache };
    for (const row of data) {
      if (row.service_id) {
        updated[row.service_id] = rowToGuide(row);
      }
    }

    memoryCache = updated;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage quota errors
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    }

    return updated;
  } catch (err) {
    console.warn("Could not sync master service guides, using local fallback", err);
    return memoryCache;
  }
}

// Auto sync on module load in browser
if (typeof window !== "undefined") {
  setTimeout(() => {
    syncMasterServiceGuides().catch(() => {});
  }, 500);
}

/** Synchronous resolver with dynamic cache lookup and fallback heuristics */
export function getDynamicRedirectGuide(keyOrSlug: string): RedirectGuide {
  if (memoryCache[keyOrSlug]) {
    return memoryCache[keyOrSlug];
  }

  // Lookup by slug
  const foundBySlug = Object.values(memoryCache).find(
    (g) => g.slug === keyOrSlug || g.id === keyOrSlug
  );
  if (foundBySlug) {
    return foundBySlug;
  }

  const key = keyOrSlug.toLowerCase();

  // Fallback mappings
  if (key.includes("warish") || key.includes("succession") || key.includes("legal-heir")) {
    return memoryCache["warish-workflow"] || REDIRECT_GUIDES["warish-workflow"];
  }

  if (key.includes("dependent") || key.includes("poshyo") || key.includes("nirbhor")) {
    return memoryCache["dependent-workflow"] || REDIRECT_GUIDES["dependent-workflow"];
  }

  if (key.startsWith("wbpms-")) {
    const sub = key.replace("wbpms-", "").toLowerCase();
    if (sub === "residential") return memoryCache["wbpms-residential"] || REDIRECT_GUIDES["wbpms-residential"];
    if (sub === "income") return memoryCache["wbpms-income"] || REDIRECT_GUIDES["wbpms-income"];
    if (sub === "character") return memoryCache["wbpms-character"] || REDIRECT_GUIDES["wbpms-character"];
    if (sub === "same-person" || sub === "sameperson") return memoryCache["wbpms-same-person"] || REDIRECT_GUIDES["wbpms-same-person"];
    if (sub === "distance") return memoryCache["wbpms-distance"] || REDIRECT_GUIDES["wbpms-distance"];
    if (sub === "caste") return memoryCache["wbpms-caste"] || REDIRECT_GUIDES["wbpms-caste"];
    if (sub === "unmarried") return memoryCache["wbpms-unmarried"] || REDIRECT_GUIDES["wbpms-unmarried"];
    return memoryCache["wbpms-general"] || REDIRECT_GUIDES["wbpms-general"];
  }

  if (key.includes("birth") || key.includes("janma")) {
    return memoryCache["birth-new"] || REDIRECT_GUIDES["birth-new"];
  }

  if (key.includes("death") || key.includes("mrityu")) {
    return memoryCache["death-new"] || REDIRECT_GUIDES["death-new"];
  }

  return memoryCache["wbpms-general"] || REDIRECT_GUIDES["wbpms-general"];
}

/** React hook to reactively use a service guide with live updates */
export function useDynamicRedirectGuide(key: string): { guide: RedirectGuide; loading: boolean } {
  const [guide, setGuide] = useState<RedirectGuide>(() => getDynamicRedirectGuide(key));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setGuide(getDynamicRedirectGuide(key));

    const handleUpdate = () => {
      setGuide(getDynamicRedirectGuide(key));
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
    };
  }, [key]);

  return { guide, loading };
}

/** React hook to get all service guides for admin list / management */
export function useAllDynamicRedirectGuides(): {
  guides: Record<string, RedirectGuide>;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [guides, setGuides] = useState<Record<string, RedirectGuide>>(memoryCache);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await syncMasterServiceGuides();
      setGuides({ ...updated });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setGuides({ ...e.detail });
      }
    };
    window.addEventListener(EVENT_NAME, handleUpdate);
    refresh();
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
    };
  }, [refresh]);

  return { guides, loading, refresh };
}

/** Save or update a service guide into the master database */
export async function saveMasterServiceGuide(guide: RedirectGuide): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanYtId = guide.videoGuide?.youtubeUrl ? extractYouTubeId(guide.videoGuide.youtubeUrl) : (guide.videoGuide?.youtubeId || "");
    const cleanYtUrl = cleanYtId
      ? `https://www.youtube.com/watch?v=${cleanYtId}`
      : (guide.videoGuide?.youtubeUrl || "");

    const payload = {
      slug: guide.slug || guide.id,
      title: guide.title,
      bengali_title: guide.bengaliTitle || null,
      category: guide.category || "General",
      category_id: guide.categoryId || null,
      display_order: typeof guide.displayOrder === "number" ? guide.displayOrder : 0,
      portal_name: guide.portalName,
      portal_url: guide.portalUrl,
      destination_type: guide.destinationType || "EXTERNAL_URL",
      official_dept: guide.officialDept,
      description: guide.description,
      bengali_description: guide.bengaliDescription || null,
      regulatory_info: guide.regulatoryInfo || null,
      turnaround_time: guide.turnaroundTime || "7-15 working days",
      validity: guide.validity || null,
      fee_info: guide.feeInfo || null,
      eligibility: guide.eligibility || [],
      purposes: guide.purposes || [],
      workflow: guide.workflow || [],
      documents: guide.documents || [],
      faqs: guide.faqs || [],
      download_form_url: guide.downloadFormUrl || null,
      download_form_label: guide.downloadFormLabel || null,
      video_guide: guide.videoGuide
        ? {
            ...guide.videoGuide,
            youtubeId: cleanYtId,
            youtubeUrl: cleanYtUrl,
          }
        : {},
      local_office_notice: guide.localOfficeNotice || null,
      is_active: true,
    };

    // First try RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "save_master_service_guide" as any,
      {
        _service_id: guide.id,
        _payload: payload,
      } as any
    );

    if (rpcError) {
      // Fallback to direct table upsert
      const { error: upsertError } = await supabase
        .from("master_service_guides" as any)
        .upsert(
          {
            service_id: guide.id,
            ...payload,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "service_id" }
        );

      if (upsertError) {
        throw new Error(upsertError.message || rpcError.message);
      }
    }

    // Update in-memory and local storage
    const updatedGuide: RedirectGuide = {
      ...guide,
      videoGuide: guide.videoGuide
        ? {
            ...guide.videoGuide,
            youtubeId: cleanYtId,
            youtubeUrl: cleanYtUrl,
          }
        : undefined,
    };

    memoryCache = {
      ...memoryCache,
      [guide.id]: updatedGuide,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
    } catch {
      // Ignore
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: memoryCache }));
    }

    // Log admin activity
    await logActivity({
      action_type: "master_service_guide.update",
      target_table: "master_service_guides",
      target_id: guide.id,
      metadata: { title: guide.title, youtubeId: cleanYtId },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to save master service guide:", err);
    return { success: false, error: err.message || "Failed to save SOP" };
  }
}

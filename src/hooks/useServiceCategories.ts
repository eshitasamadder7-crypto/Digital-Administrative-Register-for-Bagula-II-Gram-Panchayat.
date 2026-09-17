import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_CATEGORIES, type ServiceCategoryDef } from "@/pages/Index";
import { useAllDynamicRedirectGuides } from "@/lib/sopMasterData";

export function useServiceCategories(): {
  categories: ServiceCategoryDef[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [categories, setCategories] = useState<ServiceCategoryDef[]>(SERVICE_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(false);
  const { guides } = useAllDynamicRedirectGuides();

  const loadFromDb = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch categories from master_service_categories
      const { data: dbCategories, error: catError } = await supabase
        .from("master_service_categories" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // 2. Fetch active service guides
      const { data: dbGuides, error: guideError } = await supabase
        .from("master_service_guides" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // If DB has no data yet, merge with the memoryCache guides
      if ((!dbGuides || dbGuides.length === 0) && Object.keys(guides).length > 0) {
        // Overlay dynamically loaded guides on top of static SERVICE_CATEGORIES
        const enriched = SERVICE_CATEGORIES.map((cat) => {
          const updatedServices = cat.services.map((srv) => {
            const dynamic = guides[srv.guideKey] || guides[srv.id];
            if (dynamic) {
              return {
                ...srv,
                title: dynamic.title || srv.title,
                bengaliTitle: dynamic.bengaliTitle || srv.bengaliTitle,
                desc: dynamic.description || srv.desc,
                turnaround: dynamic.turnaroundTime || srv.turnaround,
              };
            }
            return srv;
          });
          return { ...cat, services: updatedServices };
        });
        setCategories(enriched);
        return;
      }

      if (dbGuides && dbGuides.length > 0) {
        // Build category map from DB categories or fallback
        const baseCategories: ServiceCategoryDef[] = (dbCategories && dbCategories.length > 0)
          ? dbCategories.map((c: any) => ({
              id: c.id,
              name: c.name,
              nameBn: c.name_bn || "",
              icon: c.icon || "📜",
              description: c.description || "",
              services: [],
            }))
          : SERVICE_CATEGORIES.map((c) => ({ ...c, services: [] }));

        const categoryMap = new Map<string, ServiceCategoryDef>();
        for (const cat of baseCategories) {
          categoryMap.set(cat.id, { ...cat, services: [] });
        }

        // Map each guide into its category
        for (const g of dbGuides) {
          let targetCatId = g.category_id;
          if (!targetCatId) {
            // Find existing matching category from static list or by keyword
            const foundCat = SERVICE_CATEGORIES.find((sc) =>
              sc.services.some((s) => s.id === g.service_id || s.guideKey === g.service_id)
            );
            if (foundCat) {
              targetCatId = foundCat.id;
            } else {
              targetCatId = "wbpms";
            }
          }

          let catObj = categoryMap.get(targetCatId);
          if (!catObj) {
            // Default to first category or wbpms
            catObj = categoryMap.get("wbpms") || baseCategories[0];
          }

          if (catObj) {
            // Determine icon and applyUrl
            const staticMatch = SERVICE_CATEGORIES.flatMap((c) => c.services).find(
              (s) => s.id === g.service_id || s.guideKey === g.service_id
            );

            catObj.services.push({
              id: g.service_id,
              title: g.title || g.service_id,
              bengaliTitle: g.bengali_title || "",
              desc: g.description || "",
              guideKey: g.slug || g.service_id,
              applyUrl: staticMatch?.applyUrl || (g.portal_url && g.portal_url !== "#" ? g.portal_url : undefined),
              applyLabel: staticMatch?.applyLabel || "View SOP & Apply",
              icon: staticMatch?.icon || "📄",
              turnaround: g.turnaround_time || "7-15 working days",
            });
          }
        }

        // Filter out categories with 0 services unless they are elected-reps
        const finalCategories = Array.from(categoryMap.values()).filter(
          (c) => c.services.length > 0 || c.id === "elected-reps"
        );

        if (finalCategories.length > 0) {
          setCategories(finalCategories);
        }
      }
    } catch (err) {
      console.warn("Could not fetch database service categories, using cached baseline:", err);
    } finally {
      setLoading(false);
    }
  }, [guides]);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  return { categories, loading, refresh: loadFromDb };
}

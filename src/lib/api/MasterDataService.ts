import { supabase } from "@/integrations/supabase/client";
import { getMasterDataOverrides } from "@/lib/masterData";

export interface MasterVillage {
  id: string;
  name: string;
  is_active: boolean;
}

export interface MasterPostOffice {
  id: string;
  name: string;
  pin_code: string;
  is_active: boolean;
}

export interface VillageWithPostOffices extends MasterVillage {
  postOffices: MasterPostOffice[];
}

export interface MasterRelation {
  id: string;
  relation_name: string;
  relation_name_bn?: string | null;
  is_active: boolean;
}

export const STANDARD_BAGULA_VILLAGES_FALLBACK: VillageWithPostOffices[] = [
  {
    id: "v-bagula-college-para",
    name: "Bagula College Para",
    is_active: true,
    postOffices: [{ id: "po-bagula", name: "Bagula", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-bagula-madhyapara",
    name: "Bagula Madhyapara",
    is_active: true,
    postOffices: [{ id: "po-bagula", name: "Bagula", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-bagula-puratanpara",
    name: "Bagula Puratanpara",
    is_active: true,
    postOffices: [{ id: "po-bagula", name: "Bagula", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-bagula-station-para",
    name: "Bagula Station Para",
    is_active: true,
    postOffices: [{ id: "po-bagula", name: "Bagula", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-bara-muragacha",
    name: "Bara Muragacha",
    is_active: true,
    postOffices: [{ id: "po-muragacha-colony", name: "Muragacha Colony", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-hatibandha",
    name: "Hatibandha",
    is_active: true,
    postOffices: [{ id: "po-santinagar", name: "Santinagar", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-madna",
    name: "Madna",
    is_active: true,
    postOffices: [{ id: "po-hatibandha", name: "Hatibandha", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-milannagar",
    name: "Milannagar",
    is_active: true,
    postOffices: [{ id: "po-muragacha-colony", name: "Muragacha Colony", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-muragacha-colony",
    name: "Muragacha Colony",
    is_active: true,
    postOffices: [{ id: "po-muragacha-colony", name: "Muragacha Colony", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-muragacha-colony-madhyapara",
    name: "Muragacha Colony Madhyapara",
    is_active: true,
    postOffices: [{ id: "po-muragacha-colony", name: "Muragacha Colony", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-sahapur",
    name: "Sahapur",
    is_active: true,
    postOffices: [{ id: "po-haldipara", name: "Haldipara", pin_code: "741502", is_active: true }],
  },
  {
    id: "v-santinagar",
    name: "Santinagar",
    is_active: true,
    postOffices: [{ id: "po-santinagar", name: "Santinagar", pin_code: "741502", is_active: true }],
  },
];

export const STANDARD_RELATIONS_FALLBACK: MasterRelation[] = [
  { id: "rel-son", relation_name: "Son", relation_name_bn: "পুত্র", is_active: true },
  { id: "rel-daughter", relation_name: "Daughter", relation_name_bn: "কন্যা", is_active: true },
  { id: "rel-wife", relation_name: "Wife", relation_name_bn: "স্ত্রী", is_active: true },
  { id: "rel-husband", relation_name: "Husband", relation_name_bn: "স্বামী", is_active: true },
  { id: "rel-father", relation_name: "Father", relation_name_bn: "পিতা", is_active: true },
  { id: "rel-mother", relation_name: "Mother", relation_name_bn: "মাতা", is_active: true },
  { id: "rel-brother", relation_name: "Brother", relation_name_bn: "ভাই / ভ্রাতা", is_active: true },
  { id: "rel-sister", relation_name: "Sister", relation_name_bn: "বোন / ভগিনী", is_active: true },
  { id: "rel-grandson", relation_name: "Grandson", relation_name_bn: "পৌত্র (নাতি)", is_active: true },
  { id: "rel-granddaughter", relation_name: "Granddaughter", relation_name_bn: "পৌত্রী (নাতনি)", is_active: true },
  { id: "rel-great-grandson", relation_name: "Great-Grandson", relation_name_bn: "প্রপৌত্র", is_active: true },
  { id: "rel-great-granddaughter", relation_name: "Great-Granddaughter", relation_name_bn: "প্রপৌত্রী", is_active: true },
  { id: "rel-great-great-grandson", relation_name: "Great-Great-Grandson", relation_name_bn: "প্র-প্রপৌত্র", is_active: true },
  { id: "rel-great-great-granddaughter", relation_name: "Great-Great-Granddaughter", relation_name_bn: "প্র-প্রপৌত্রী", is_active: true },
  { id: "rel-daughter-in-law", relation_name: "Daughter-in-law", relation_name_bn: "পুত্রবধূ", is_active: true },
  { id: "rel-nephew", relation_name: "Nephew", relation_name_bn: "ভাগ্নে / ভাইপো", is_active: true },
  { id: "rel-niece", relation_name: "Niece", relation_name_bn: "ভাগ্নী / ভাইঝি", is_active: true },
  { id: "rel-other", relation_name: "Other Legal Heir", relation_name_bn: "অন্যান্য ওয়ারিশ", is_active: true },
];

let cachedVillages: VillageWithPostOffices[] | null = null;
let cachedRelations: MasterRelation[] | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("bagula_master_data_updated", () => {
    cachedVillages = null;
    cachedRelations = null;
  });
}

export class MasterDataService {
  /**
   * Clears in-memory caches.
   */
  static clearCache() {
    cachedVillages = null;
    cachedRelations = null;
  }

  /**
   * Fetches all active villages and their associated active post offices.
   * Prioritizes live configuration in master_data table so admin updates take effect immediately.
   */
  static async getActiveVillagesWithPostOffices(): Promise<VillageWithPostOffices[]> {
    if (cachedVillages && cachedVillages.length > 0) {
      return cachedVillages;
    }

    try {
      const overrides = getMasterDataOverrides();
      // 1. Fetch villages and post offices from master_data
      const [{ data: rawVillages }, { data: rawPostOffices }] = await Promise.all([
        supabase
          .from("master_data" as any)
          .select("id, code, label, label_bn, parent_code, is_active, sort_order")
          .eq("category", "village")
          .order("sort_order", { ascending: true }),
        supabase
          .from("master_data" as any)
          .select("id, code, label, label_bn, parent_code, is_active, sort_order")
          .eq("category", "post_office")
          .order("sort_order", { ascending: true }),
      ]);

      const mdVillages = (rawVillages || []).filter((v: any) => {
        const ov = overrides[v.id];
        if (typeof ov === "boolean") return ov;
        return v.is_active !== false;
      });

      const mdPostOffices = (rawPostOffices || []).filter((po: any) => {
        const ov = overrides[po.id];
        if (typeof ov === "boolean") return ov;
        return po.is_active !== false;
      });

      if (mdVillages && mdVillages.length > 0 && (mdVillages[0].label || !mdVillages[0].master_village_post_offices)) {
        // Build post office lookup
        const poMap = new Map<string, MasterPostOffice>();
        (mdPostOffices || []).forEach((po: any) => {
          const poObj: MasterPostOffice = {
            id: po.id || "po-bagula",
            name: po.label || po.name || "Bagula",
            pin_code: po.parent_code || po.pin_code || "741502",
            is_active: po.is_active ?? true,
          };
          if (po.code) poMap.set(String(po.code).toLowerCase(), poObj);
          if (po.label) poMap.set(String(po.label).toLowerCase(), poObj);
          if (po.name) poMap.set(String(po.name).toLowerCase(), poObj);
          if (po.id) poMap.set(String(po.id).toLowerCase(), poObj);
        });

        // Default Bagula PO if not found
        const defaultPo: MasterPostOffice = {
          id: "po-bagula",
          name: "Bagula",
          pin_code: "741502",
          is_active: true,
        };

        const list: VillageWithPostOffices[] = mdVillages.map((mv: any) => {
          let matchedPo: MasterPostOffice | undefined;
          if (mv.parent_code) {
            matchedPo = poMap.get(String(mv.parent_code).toLowerCase());
          }
          if (!matchedPo && mv.master_village_post_offices?.[0]?.post_office) {
            const legPo = mv.master_village_post_offices[0].post_office;
            matchedPo = {
              id: legPo.id || "po-1",
              name: legPo.name || "Bagula",
              pin_code: legPo.pin_code || "741502",
              is_active: legPo.is_active ?? true,
            };
          }
          if (!matchedPo) {
            // Check by name heuristics
            const lowerLabel = String(mv.label || mv.name || "").toLowerCase();
            if (lowerLabel.includes("muragacha") || lowerLabel.includes("milan")) {
              matchedPo = poMap.get("muragacha_colony") || poMap.get("muragacha colony");
            } else if (lowerLabel.includes("sahapur")) {
              matchedPo = poMap.get("haldipara");
            } else if (lowerLabel.includes("santinagar") || lowerLabel.includes("hatibandha")) {
              matchedPo = poMap.get("santinagar") || poMap.get("hatibandha");
            } else if (lowerLabel.includes("madna")) {
              matchedPo = poMap.get("hatibandha");
            }
          }

          return {
            id: mv.id,
            name: mv.label || mv.name || "Village",
            is_active: mv.is_active ?? true,
            postOffices: [matchedPo || defaultPo],
          };
        });

        cachedVillages = list;
        return list;
      }

      // 2. Secondary fallback: query legacy master_villages table
      const { data, error } = await supabase
        .from("master_villages")
        .select(`
          id, name, is_active,
          master_village_post_offices!inner(
            is_active,
            post_office:master_post_offices(id, name, pin_code, is_active)
          )
        `)
        .eq("is_active", true)
        .eq("master_village_post_offices.is_active", true)
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        const transformed = data.map((v: any) => ({
          id: v.id,
          name: v.name,
          is_active: v.is_active,
          postOffices: (v.master_village_post_offices || [])
            .filter((vpo: any) => vpo.post_office && vpo.post_office.is_active)
            .map((vpo: any) => ({
              id: vpo.post_office.id,
              name: vpo.post_office.name,
              pin_code: vpo.post_office.pin_code,
              is_active: vpo.post_office.is_active,
            })),
        }));
        cachedVillages = transformed;
        return transformed;
      }

      return STANDARD_BAGULA_VILLAGES_FALLBACK;
    } catch (e) {
      console.warn("Failed to load villages from database, applying standard master fallback", e);
      return STANDARD_BAGULA_VILLAGES_FALLBACK;
    }
  }

  /**
   * Fetches authoritative active relations from master_data (primary) and master_relations.
   */
  static async getActiveRelations(): Promise<MasterRelation[]> {
    if (cachedRelations && cachedRelations.length > 0) {
      return cachedRelations;
    }

    try {
      const overrides = getMasterDataOverrides();
      // 1. Fetch relations directly from master_data
      const { data: mdData, error: mdError } = await supabase
        .from("master_data" as any)
        .select("id, code, label, label_bn, is_active, sort_order")
        .eq("category", "relation")
        .order("sort_order", { ascending: true });

      if (!mdError && mdData && mdData.length > 0) {
        const filtered = mdData.filter((m: any) => {
          const ov = overrides[m.id];
          if (typeof ov === "boolean") return ov;
          return m.is_active !== false;
        });
        const mapped: MasterRelation[] = filtered.map((m: any) => ({
          id: m.id,
          relation_name: m.label,
          relation_name_bn: m.label_bn || null,
          is_active: true,
        }));
        cachedRelations = mapped;
        return mapped;
      }

      // 2. Secondary fallback: query master_relations table
      const { data: relData, error: relError } = await supabase
        .from("master_relations")
        .select("id, relation_name, is_active")
        .eq("is_active", true)
        .order("relation_name", { ascending: true });

      if (!relError && relData && relData.length > 0) {
        const fallbackList = relData.map((r: any) => ({
          id: r.id,
          relation_name: r.relation_name,
          relation_name_bn: null,
          is_active: r.is_active,
        }));
        cachedRelations = fallbackList;
        return fallbackList;
      }

      return STANDARD_RELATIONS_FALLBACK;
    } catch (e) {
      console.warn("Failed to load relations from master tables, using standard fallback", e);
      return STANDARD_RELATIONS_FALLBACK;
    }
  }

  /**
   * Fetches active rejection and return reasons from master_data.
   */
  static async getActiveRejectionReasons(): Promise<{ id: string; code: string; label: string; label_bn: string | null }[]> {
    try {
      const { data, error } = await supabase
        .from("master_data" as any)
        .select("id, code, label, label_bn")
        .eq("category", "rejection_reason")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return [
          { id: "rej-1", code: "rej_incomplete_affidavit", label: "Incomplete / Unsworn Court Affidavit", label_bn: "অসম্পূর্ণ বা অনুমোদনহীন কোর্ট হলফনামা" },
          { id: "rej-2", code: "rej_aadhaar_mismatch", label: "Aadhaar / Voter ID Name or Age Mismatch", label_bn: "আধার / ভোটার কার্ডের নাম বা বয়সের অমিল" },
          { id: "rej-3", code: "rej_illegible_scan", label: "Illegible, Dark or Blurry Document Scan", label_bn: "অস্পষ্ট বা অপাঠ্য স্ক্যান কপি" },
          { id: "rej-4", code: "rej_outside_gp", label: "Applicant / Property Lies Outside Bagula II GP", label_bn: "আবেদনকারী বা সম্পত্তি বগুলা ২ নং গ্রাম পঞ্চায়েতের আওতাভুক্ত নয়" },
          { id: "rej-5", code: "rej_missing_death_cert", label: "Missing Hospital / Digital Death Certificate of Deceased", label_bn: "মৃত ব্যক্তির ডিজিটাল মৃত্যু শংসাপত্র সংযুক্ত করা হয়নি" },
          { id: "rej-6", code: "rej_unverified_heir", label: "Unverified Heir or Pre-deceased Succession Chain Incomplete", label_bn: "উত্তরাধিকারীর বিবরণ অসম্পূর্ণ বা অপ্রমাণিত" },
        ];
      }
      return data as any[];
    } catch {
      return [];
    }
  }

  /**
   * Fetches active administrative designations from master_data.
   */
  static async getActiveDesignations(): Promise<{ id: string; code: string; label: string; label_bn: string | null }[]> {
    try {
      const { data, error } = await supabase
        .from("master_data" as any)
        .select("id, code, label, label_bn")
        .eq("category", "designation")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) {
        return [
          { id: "des-1", code: "pradhan", label: "Pradhan", label_bn: "প্রধান" },
          { id: "des-2", code: "upa_pradhan", label: "Upa-Pradhan", label_bn: "উপ-প্রধান" },
          { id: "des-3", code: "ea", label: "Executive Assistant (EA)", label_bn: "নির্বাহী সহায়ক" },
          { id: "des-4", code: "sec", label: "Secretary", label_bn: "সচিব" },
          { id: "des-5", code: "sahayak", label: "Sahayak", label_bn: "সহায়ক" },
          { id: "des-6", code: "ns", label: "Nirman Sahayak (NS)", label_bn: "নির্মাণ সহায়ক" },
          { id: "des-7", code: "gpk", label: "Gram Panchayat Karmee (GPK)", label_bn: "গ্রাম পঞ্চায়েত কর্মী" },
          { id: "des-8", code: "tax_collector", label: "Tax Collector", label_bn: "কর আদায়কারী" },
        ];
      }
      return data as any[];
    } catch {
      return [];
    }
  }

  /**
   * Fetches generalized active master data (like prefixes, relationships)
   * which fall under the generic master_data EAV schema.
   */
  static async getActiveMasterData(category: string) {
    const overrides = getMasterDataOverrides();
    const { data, error } = await supabase
      .from("master_data" as any)
      .select("*")
      .eq("category", category)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(`Failed to fetch master data for category ${category}:`, error.message);
      return [];
    }

    const filtered = (data || []).filter((item: any) => {
      const ov = overrides[item.id];
      if (typeof ov === "boolean") return ov;
      return item.is_active !== false;
    });

    return filtered;
  }
}


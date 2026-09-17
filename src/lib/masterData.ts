// Shared Bagula-II Gram Panchayat master data.
//
// Since the Master Data Center was introduced, the authoritative lists live in
// the `master_data` table. The constants below stay as an offline fallback so
// existing forms keep working even before the table loads (or offline).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedAuthoritySettings } from "./appSettings";

export const VILLAGES = [
  "Bagula Station Para",
  "Bagula Puratanpara",
  "Bagula Madhyapara",
  "Bagula College Para",
  "Bara Muragacha",
  "Muragacha Colony",
  "Muragacha Colony Madhyapara",
  "Milannagar",
  "Sahapur",
  "Hatibandha",
  "Santinagar",
  "Madna",
];

export const POST_OFFICES = [
  "Bagula",
  "Muragacha Colony",
  "Haldipara",
  "Santinagar",
  "Hatibandha",
];

// Village -> Post Office mapping (mirrors the office-side certificate modules).
const VILLAGE_PO_RULES: { match: RegExp; po: string }[] = [
  { match: /^(bagula station para|bagula puratanpara|bagula madhyapara|bagula college para)$/i, po: "Bagula" },
  { match: /^(bara muragacha|muragacha colony|muragacha colony madhyapara|milannagar)$/i, po: "Muragacha Colony" },
  { match: /^sahapur$/i, po: "Haldipara" },
  { match: /^santinagar$/i, po: "Santinagar" },
  { match: /^hatibandha$/i, po: "Santinagar" },
  { match: /^madna$/i, po: "Hatibandha" },
];

export function resolvePostOffice(village: string): string {
  return VILLAGE_PO_RULES.find((r) => r.match.test(village.trim()))?.po ?? "";
}

/**
 * Dynamic jurisdiction settings, backed by active administrative authority settings
 * with static defaults.
 */
export const JURISDICTION = {
  get gramPanchayat() {
    return getCachedAuthoritySettings().gramPanchayatName || "Bagula 2 No. Gram Panchayat";
  },
  get block() {
    return getCachedAuthoritySettings().blockName || "Hanskhali";
  },
  get policeStation() {
    return getCachedAuthoritySettings().policeStationName || "Hanskhali P.S.";
  },
  get district() {
    return getCachedAuthoritySettings().districtName || "Nadia";
  },
  get state() {
    return getCachedAuthoritySettings().stateName || "West Bengal";
  },
  get pin() {
    return getCachedAuthoritySettings().pinCode || "741502";
  },
};

/* ------------------------------------------------------------------ */
/* Master Data Center                                                  */
/* ------------------------------------------------------------------ */

export type MasterCategory =
  | "village"
  | "post_office"
  | "ward"
  | "relation"
  | "document_type"
  | "designation"
  | "rejection_reason"
  | "sop_guides";

export const MASTER_CATEGORIES: { key: MasterCategory; label: string; emoji: string; hint: string }[] = [
  { key: "village", label: "Villages", emoji: "🏘️", hint: "Authoritative villages of Bagula-II GP used across all forms." },
  { key: "post_office", label: "Post Offices", emoji: "📮", hint: "Postal zones with PIN 741502 linked to GP villages." },
  { key: "ward", label: "Wards & Sansads", emoji: "🗺️", hint: "Gram Panchayat ward numbers and sansad members." },
  { key: "relation", label: "Relations & Legal Heirs", emoji: "👪", hint: "Heir / dependent legal relationship categories." },
  { key: "document_type", label: "Document Types", emoji: "📄", hint: "Statutory attachment and proof categories." },
  { key: "designation", label: "Designations", emoji: "🏷️", hint: "Office job titles & administrative roles." },
  { key: "rejection_reason", label: "Rejection Reasons", emoji: "⚠️", hint: "Standard objections & return reasons for applications." },
  { key: "sop_guides", label: "SOPs, Workflows & Videos", emoji: "🎬", hint: "Manage YouTube video links, step-by-step SOP workflows, document checklists, and guidelines for all 18 services." },
];

export interface MasterDataItem {
  id: string;
  category: string;
  code: string;
  label: string;
  label_bn: string | null;
  parent_code: string | null;
  sort_order: number;
  is_active: boolean;
}

const FALLBACK: Partial<Record<MasterCategory, string[]>> = {
  village: VILLAGES,
  post_office: POST_OFFICES,
  designation: ["Executive Assistant (EA)", "Secretary", "Sahayak", "Gram Panchayat Karmee (GPK)", "Nirman Sahayak (NS)", "Tax Collector", "Pradhan", "Upa-Pradhan"],
  relation: ["Son", "Daughter", "Wife", "Husband", "Father", "Mother", "Brother", "Sister", "Grandson", "Granddaughter", "Daughter-in-law", "Other Legal Heir"],
  rejection_reason: ["Incomplete Court Affidavit", "Aadhaar Name Mismatch", "Illegible / Blurry Document Scan", "Outside Bagula II GP Jurisdiction", "Missing Deceased Digital Death Certificate", "Unverified Heir Details"],
};

export const OFFICIAL_MASTER_DATA_SEEDS: Omit<MasterDataItem, "id">[] = [
  // Villages
  { category: "village", code: "bagula_station_para", label: "Bagula Station Para", label_bn: "বগুলা স্টেশনপাড়া", parent_code: "bagula", sort_order: 1, is_active: true },
  { category: "village", code: "bagula_puratanpara", label: "Bagula Puratanpara", label_bn: "বগুলা পুরাতনপাড়া", parent_code: "bagula", sort_order: 2, is_active: true },
  { category: "village", code: "bagula_madhyapara", label: "Bagula Madhyapara", label_bn: "বগুলা মধ্যপাড়া", parent_code: "bagula", sort_order: 3, is_active: true },
  { category: "village", code: "bagula_college_para", label: "Bagula College Para", label_bn: "বগুলা কলেজপাড়া", parent_code: "bagula", sort_order: 4, is_active: true },
  { category: "village", code: "bara_muragacha", label: "Bara Muragacha", label_bn: "বড় মুড়াগাছা", parent_code: "muragacha_colony", sort_order: 5, is_active: true },
  { category: "village", code: "muragacha_colony", label: "Muragacha Colony", label_bn: "মুড়াগাছা কলোনি", parent_code: "muragacha_colony", sort_order: 6, is_active: true },
  { category: "village", code: "muragacha_colony_madhyapara", label: "Muragacha Colony Madhyapara", label_bn: "মুড়াগাছা কলোনি মধ্যপাড়া", parent_code: "muragacha_colony", sort_order: 7, is_active: true },
  { category: "village", code: "milannagar", label: "Milannagar", label_bn: "মিলননগর", parent_code: "muragacha_colony", sort_order: 8, is_active: true },
  { category: "village", code: "sahapur", label: "Sahapur", label_bn: "সাহাপুর", parent_code: "haldipara", sort_order: 9, is_active: true },
  { category: "village", code: "hatibandha", label: "Hatibandha", label_bn: "হাতিবান্ধা", parent_code: "santinagar", sort_order: 10, is_active: true },
  { category: "village", code: "santinagar", label: "Santinagar", label_bn: "শান্তিনগর", parent_code: "santinagar", sort_order: 11, is_active: true },
  { category: "village", code: "madna", label: "Madna", label_bn: "মাদনা", parent_code: "hatibandha", sort_order: 12, is_active: true },

  // Post Offices
  { category: "post_office", code: "bagula", label: "Bagula", label_bn: "বগুলা", parent_code: "741502", sort_order: 1, is_active: true },
  { category: "post_office", code: "muragacha_colony", label: "Muragacha Colony", label_bn: "মুড়াগাছা কলোনি", parent_code: "741502", sort_order: 2, is_active: true },
  { category: "post_office", code: "haldipara", label: "Haldipara", label_bn: "হলদিপাড়া", parent_code: "741502", sort_order: 3, is_active: true },
  { category: "post_office", code: "santinagar", label: "Santinagar", label_bn: "শান্তিনগর", parent_code: "741502", sort_order: 4, is_active: true },
  { category: "post_office", code: "hatibandha", label: "Hatibandha", label_bn: "হাতিবান্ধা", parent_code: "741502", sort_order: 5, is_active: true },

  // Relations
  { category: "relation", code: "son", label: "Son", label_bn: "পুত্র", parent_code: "heir", sort_order: 1, is_active: true },
  { category: "relation", code: "daughter", label: "Daughter", label_bn: "কন্যা", parent_code: "heir", sort_order: 2, is_active: true },
  { category: "relation", code: "wife", label: "Wife", label_bn: "স্ত্রী", parent_code: "heir", sort_order: 3, is_active: true },
  { category: "relation", code: "husband", label: "Husband", label_bn: "স্বামী", parent_code: "heir", sort_order: 4, is_active: true },
  { category: "relation", code: "father", label: "Father", label_bn: "পিতা", parent_code: "heir", sort_order: 5, is_active: true },
  { category: "relation", code: "mother", label: "Mother", label_bn: "মাতা", parent_code: "heir", sort_order: 6, is_active: true },
  { category: "relation", code: "brother", label: "Brother", label_bn: "ভাই / ভ্রাতা", parent_code: "heir", sort_order: 7, is_active: true },
  { category: "relation", code: "sister", label: "Sister", label_bn: "বোন / ভগিনী", parent_code: "heir", sort_order: 8, is_active: true },
  { category: "relation", code: "grandson", label: "Grandson", label_bn: "পৌত্র (নাতি)", parent_code: "heir", sort_order: 9, is_active: true },
  { category: "relation", code: "granddaughter", label: "Granddaughter", label_bn: "পৌত্রী (নাতনি)", parent_code: "heir", sort_order: 10, is_active: true },
  { category: "relation", code: "daughter_in_law", label: "Daughter-in-law", label_bn: "পুত্রবধূ", parent_code: "heir", sort_order: 11, is_active: true },
  { category: "relation", code: "other", label: "Other Legal Heir", label_bn: "অন্যান্য ওয়ারিশ", parent_code: "heir", sort_order: 12, is_active: true },

  // Designations
  { category: "designation", code: "pradhan", label: "Pradhan", label_bn: "প্রধান", parent_code: null, sort_order: 1, is_active: true },
  { category: "designation", code: "upa_pradhan", label: "Upa-Pradhan", label_bn: "উপ-প্রধান", parent_code: null, sort_order: 2, is_active: true },
  { category: "designation", code: "ea", label: "Executive Assistant (EA)", label_bn: "নির্বাহী সহায়ক", parent_code: null, sort_order: 3, is_active: true },
  { category: "designation", code: "sec", label: "Secretary", label_bn: "সচিব", parent_code: null, sort_order: 4, is_active: true },
  { category: "designation", code: "sahayak", label: "Sahayak", label_bn: "সহায়ক", parent_code: null, sort_order: 5, is_active: true },
  { category: "designation", code: "ns", label: "Nirman Sahayak (NS)", label_bn: "নির্মাণ সহায়ক", parent_code: null, sort_order: 6, is_active: true },
  { category: "designation", code: "gpk", label: "Gram Panchayat Karmee (GPK)", label_bn: "গ্রাম পঞ্চায়েত কর্মী", parent_code: null, sort_order: 7, is_active: true },
  { category: "designation", code: "tax_collector", label: "Tax Collector", label_bn: "কর আদায়কারী", parent_code: null, sort_order: 8, is_active: true },

  // Rejection Reasons
  { category: "rejection_reason", code: "rej_incomplete_affidavit", label: "Incomplete / Unsworn Court Affidavit", label_bn: "অসম্পূর্ণ বা অনুমোদনহীন কোর্ট হলফনামা", parent_code: "warish", sort_order: 1, is_active: true },
  { category: "rejection_reason", code: "rej_aadhaar_mismatch", label: "Aadhaar / Voter ID Name or Age Mismatch", label_bn: "আধার / ভোটার কার্ডের নাম বা বয়সের অমিল", parent_code: "identity", sort_order: 2, is_active: true },
  { category: "rejection_reason", code: "rej_illegible_scan", label: "Illegible, Dark or Blurry Document Scan", label_bn: "অস্পষ্ট বা অপাঠ্য স্ক্যান কপি", parent_code: "upload", sort_order: 3, is_active: true },
  { category: "rejection_reason", code: "rej_outside_gp", label: "Applicant / Property Lies Outside Bagula II GP", label_bn: "আবেদনকারী বা সম্পত্তি বগুলা ২ নং গ্রাম পঞ্চায়েতের আওতাভুক্ত নয়", parent_code: "jurisdiction", sort_order: 4, is_active: true },
  { category: "rejection_reason", code: "rej_missing_death_cert", label: "Missing Hospital / Digital Death Certificate of Deceased", label_bn: "মৃত ব্যক্তির ডিজিটাল মৃত্যু শংসাপত্র সংযুক্ত করা হয়নি", parent_code: "warish", sort_order: 5, is_active: true },
  { category: "rejection_reason", code: "rej_unverified_heir", label: "Unverified Heir or Pre-deceased Succession Chain Incomplete", label_bn: "উত্তরাধিকারীর বিবরণ অসম্পূর্ণ বা অপ্রমাণিত", parent_code: "warish", sort_order: 6, is_active: true },

  // Document Types
  { category: "document_type", code: "doc_death_certificate", label: "Digital Death Certificate", label_bn: "ডিজিটাল মৃত্যু শংসাপত্র", parent_code: "warish", sort_order: 1, is_active: true },
  { category: "document_type", code: "doc_court_affidavit", label: "Court Affidavit of Succession (Vamshabriksha)", label_bn: "কোর্ট হলফনামা ও বংশবৃক্ষ", parent_code: "warish", sort_order: 2, is_active: true },
  { category: "document_type", code: "doc_gp_tax_receipt", label: "GP Household Tax Clearance Receipt", label_bn: "পঞ্চায়েত ট্যাক্স / খাজনা রশিদ", parent_code: "warish", sort_order: 3, is_active: true },
  { category: "document_type", code: "doc_heir_aadhaar", label: "Aadhaar Card of Applicant & Legal Heirs", label_bn: "আবেদনকারী ও সকল ওয়ারিশের আধার কার্ড", parent_code: "identity", sort_order: 4, is_active: true },
  { category: "document_type", code: "doc_land_deed", label: "Registered Land Deed (দলিল) or RoR / Porcha (খতিয়ান)", label_bn: "জমির দলিল বা খতিয়ান পরচা", parent_code: "warish", sort_order: 5, is_active: true },
  { category: "document_type", code: "doc_police_gd", label: "Police GD Loss Report", label_bn: "থানার জেনারেল ডায়েরি (GD) রিপোর্ট", parent_code: "birth_digitization", sort_order: 6, is_active: true },
  { category: "document_type", code: "doc_old_birth_cert", label: "Original Manual Birth Certificate Scan", label_bn: "হাতে লেখা পুরোনো জন্ম সনদপত্র", parent_code: "birth_digitization", sort_order: 7, is_active: true },
];

export function broadcastMasterDataUpdate(category?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bagula_master_data_updated", { detail: { category } }));
  }
}

/**
 * Seeds official Bagula-II standard master data entries into master_data table.
 */
export async function seedDefaultMasterData(targetCategory?: MasterCategory): Promise<{ added: number; skipped: number }> {
  const seedsToInsert = targetCategory
    ? OFFICIAL_MASTER_DATA_SEEDS.filter((s) => s.category === targetCategory)
    : OFFICIAL_MASTER_DATA_SEEDS;

  if (seedsToInsert.length === 0) return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;

  try {
    // 1. Fetch existing codes in one round-trip
    let query = supabase.from("master_data" as never).select("category, code");
    if (targetCategory) {
      query = query.eq("category", targetCategory);
    }
    const { data: existingRows } = await query;
    const existingSet = new Set(
      ((existingRows || []) as { category: string; code: string }[]).map(
        (r) => `${r.category}:${r.code}`
      )
    );

    const missingSeeds = seedsToInsert.filter((s) => !existingSet.has(`${s.category}:${s.code}`));
    skipped = seedsToInsert.length - missingSeeds.length;

    if (missingSeeds.length > 0) {
      const payload = missingSeeds.map((item) => ({
        category: item.category,
        code: item.code,
        label: item.label,
        label_bn: item.label_bn || null,
        parent_code: item.parent_code || null,
        sort_order: item.sort_order,
        is_active: item.is_active,
      }));

      // Insert in chunks of 25 to avoid payload limits
      for (let i = 0; i < payload.length; i += 25) {
        const chunk = payload.slice(i, i + 25);
        const { error } = await supabase.from("master_data" as never).insert(chunk as never);
        if (!error) {
          added += chunk.length;
        } else {
          // Fall back to item-by-item upsert
          for (const item of chunk) {
            const { error: singleErr } = await supabase
              .from("master_data" as never)
              .upsert(item as never, { onConflict: "category,code" } as never);
            if (!singleErr) added++;
            else skipped++;
          }
        }
      }
    }
    broadcastMasterDataUpdate(targetCategory);
  } catch (err) {
    console.warn("Notice: seedDefaultMasterData error:", err);
  }

  return { added, skipped };
}

const OVERRIDES_STORAGE_KEY = "bagula_master_data_state_overrides";

export function getMasterDataOverrides(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMasterDataOverride(id: string, isActive: boolean) {
  if (typeof window === "undefined") return;
  try {
    const current = getMasterDataOverrides();
    current[id] = isActive;
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // non-fatal
  }
}

export function removeMasterDataOverride(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getMasterDataOverrides();
    delete current[id];
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // non-fatal
  }
}

/** Reads an active master list. Falls back to bundled constants on failure. Automatically reacts to real-time master data updates. */
export function useMasterData(category: MasterCategory) {
  const [items, setItems] = useState<MasterDataItem[] | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const overrides = getMasterDataOverrides();
      const { data, error } = await supabase
        .from("master_data" as never)
        .select("*")
        .eq("category", category)
        .order("sort_order", { ascending: true });
      if (!active) return;
      if (error || !data || (data as any[]).length === 0) {
        const fallbackItems = (FALLBACK[category] ?? []).map((label, i) => {
          const id = `fallback-${category}-${i}`;
          const is_active = typeof overrides[id] === "boolean" ? overrides[id] : true;
          return {
            id,
            category,
            code: label.toLowerCase().replace(/\W+/g, "_"),
            label,
            label_bn: null,
            parent_code: null,
            sort_order: i,
            is_active,
          };
        });
        setItems(fallbackItems.filter((it) => it.is_active));
        return;
      }

      const merged = (data as unknown as MasterDataItem[]).map((it) => {
        if (typeof overrides[it.id] === "boolean") {
          return { ...it, is_active: overrides[it.id] };
        }
        return it;
      });

      setItems(merged.filter((it) => it.is_active));
    };

    load();

    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || !detail.category || detail.category === category) {
        load();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("bagula_master_data_updated", onUpdated);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("bagula_master_data_updated", onUpdated);
      }
    };
  }, [category]);

  return {
    loading: items === null,
    items: items ?? [],
    labels: (items ?? []).map((i) => i.label),
  };
}

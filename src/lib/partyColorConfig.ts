/**
 * Party Color Configuration & Helper System
 * Strict compliance with User Specification:
 * - BJP = Saffron
 * - TMC = Green
 * - CONG. = Blue
 * - CPIM = Red
 * - Independent / Others = Slate Neutral
 */

export type PartyKey = "bjp" | "tmc" | "cong" | "cpim" | "ind";

export interface PartyColorTheme {
  key: PartyKey;
  code: string;
  shortLabel: string;
  fullName: string;
  fullNameBn: string;
  colorName: "saffron" | "green" | "blue" | "red" | "slate";
  hex: string;
  symbol: string;
  symbolBn: string;
  logoUrl: string;

  // Visual styling classes (Tailwind)
  badgeClass: string;
  avatarBgClass: string;
  avatarTextClass: string;
  avatarBorderClass: string;
  cardBorderClass: string;
  cardBorderHoverClass: string;
  cardTopBarClass: string;
  modalHeaderGradient: string;
  lightBgClass: string;
  textAccentClass: string;
  ringClass: string;
  dotClass: string;
}

export const PARTY_THEMES: Record<PartyKey, PartyColorTheme> = {
  bjp: {
    key: "bjp",
    code: "BJP",
    shortLabel: "BJP",
    fullName: "Bharatiya Janata Party",
    fullNameBn: "ভারতীয় জনতা পার্টি",
    colorName: "saffron",
    hex: "#ea580c", // Deep Saffron (#ea580c / #f97316)
    symbol: "Lotus (পদ্ম)",
    symbolBn: "পদ্ম",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Bharatiya_Janata_Party_logo.svg/240px-Bharatiya_Janata_Party_logo.svg.png",
    badgeClass: "bg-orange-100 text-orange-950 border-orange-300 font-semibold",
    avatarBgClass: "bg-orange-50",
    avatarTextClass: "text-orange-900 font-bold",
    avatarBorderClass: "border-orange-400 ring-2 ring-orange-300/60",
    cardBorderClass: "border-orange-200/90",
    cardBorderHoverClass: "hover:border-orange-500 hover:shadow-orange-100/60",
    cardTopBarClass: "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600",
    modalHeaderGradient: "bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700",
    lightBgClass: "bg-orange-50/50",
    textAccentClass: "text-orange-800",
    ringClass: "focus:ring-orange-500",
    dotClass: "bg-orange-500",
  },
  tmc: {
    key: "tmc",
    code: "AITC",
    shortLabel: "TMC",
    fullName: "All India Trinamool Congress",
    fullNameBn: "সর্বভারতীয় তৃণমূল কংগ্রেস",
    colorName: "green",
    hex: "#16a34a", // Grass Green (#16a34a / #15803d)
    symbol: "Twin Flowers (জোড়া ঘাস ফুল)",
    symbolBn: "জোড়া ফুল",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/All_India_Trinamool_Congress_flag.svg/240px-All_India_Trinamool_Congress_flag.svg.png",
    badgeClass: "bg-emerald-100 text-emerald-950 border-emerald-300 font-semibold",
    avatarBgClass: "bg-emerald-50",
    avatarTextClass: "text-emerald-900 font-bold",
    avatarBorderClass: "border-emerald-500 ring-2 ring-emerald-300/60",
    cardBorderClass: "border-emerald-200/90",
    cardBorderHoverClass: "hover:border-emerald-500 hover:shadow-emerald-100/60",
    cardTopBarClass: "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600",
    modalHeaderGradient: "bg-gradient-to-r from-emerald-700 via-green-700 to-teal-800",
    lightBgClass: "bg-emerald-50/50",
    textAccentClass: "text-emerald-800",
    ringClass: "focus:ring-emerald-500",
    dotClass: "bg-emerald-600",
  },
  cong: {
    key: "cong",
    code: "INC",
    shortLabel: "Congress",
    fullName: "Indian National Congress",
    fullNameBn: "ভারতীয় জাতীয় কংগ্রেস",
    colorName: "blue",
    hex: "#2563eb", // Tricolor Blue (#2563eb / #1d4ed8)
    symbol: "Hand (হাত)",
    symbolBn: "হাত",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Indian_National_Congress_hand_logo.svg/240px-Indian_National_Congress_hand_logo.svg.png",
    badgeClass: "bg-blue-100 text-blue-950 border-blue-300 font-semibold",
    avatarBgClass: "bg-blue-50",
    avatarTextClass: "text-blue-900 font-bold",
    avatarBorderClass: "border-blue-500 ring-2 ring-blue-300/60",
    cardBorderClass: "border-blue-200/90",
    cardBorderHoverClass: "hover:border-blue-500 hover:shadow-blue-100/60",
    cardTopBarClass: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700",
    modalHeaderGradient: "bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900",
    lightBgClass: "bg-blue-50/50",
    textAccentClass: "text-blue-800",
    ringClass: "focus:ring-blue-500",
    dotClass: "bg-blue-600",
  },
  cpim: {
    key: "cpim",
    code: "CPIM",
    shortLabel: "CPI(M)",
    fullName: "Communist Party of India (Marxist)",
    fullNameBn: "ভারতের কমিউনিস্ট পার্টি (মার্কসবাদী)",
    colorName: "red",
    hex: "#dc2626", // Revolutionary Red (#dc2626 / #b91c1c)
    symbol: "Hammer, Sickle and Star (কাস্তে-হাতুড়ি-তারা)",
    symbolBn: "কাস্তে-হাতুড়ি-তারা",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Cpi-m-flag.svg/240px-Cpi-m-flag.svg.png",
    badgeClass: "bg-rose-100 text-rose-950 border-rose-300 font-semibold",
    avatarBgClass: "bg-rose-50",
    avatarTextClass: "text-rose-900 font-bold",
    avatarBorderClass: "border-rose-500 ring-2 ring-rose-300/60",
    cardBorderClass: "border-rose-200/90",
    cardBorderHoverClass: "hover:border-rose-500 hover:shadow-rose-100/60",
    cardTopBarClass: "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700",
    modalHeaderGradient: "bg-gradient-to-r from-rose-700 via-red-700 to-rose-900",
    lightBgClass: "bg-rose-50/50",
    textAccentClass: "text-rose-800",
    ringClass: "focus:ring-rose-500",
    dotClass: "bg-rose-600",
  },
  ind: {
    key: "ind",
    code: "IND",
    shortLabel: "IND",
    fullName: "Independent / Others",
    fullNameBn: "নির্দলীয় / অন্যান্য",
    colorName: "slate",
    hex: "#475569", // Neutral Slate (#475569)
    symbol: "Free Symbol",
    symbolBn: "স্বতন্ত্র প্রতীক",
    logoUrl: "",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 font-semibold",
    avatarBgClass: "bg-slate-100",
    avatarTextClass: "text-slate-800 font-bold",
    avatarBorderClass: "border-slate-400 ring-2 ring-slate-300/60",
    cardBorderClass: "border-slate-200",
    cardBorderHoverClass: "hover:border-slate-400 hover:shadow-slate-100/60",
    cardTopBarClass: "bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700",
    modalHeaderGradient: "bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900",
    lightBgClass: "bg-slate-50/50",
    textAccentClass: "text-slate-700",
    ringClass: "focus:ring-slate-500",
    dotClass: "bg-slate-500",
  },
};

export const PARTY_OPTIONS: PartyColorTheme[] = [
  PARTY_THEMES.bjp,
  PARTY_THEMES.tmc,
  PARTY_THEMES.cong,
  PARTY_THEMES.cpim,
  PARTY_THEMES.ind,
];

/**
 * Resolves a party name, code, or alias to the standardized PartyColorTheme.
 */
export function getPartyColorConfig(partyOrCode?: string | null): PartyColorTheme {
  if (!partyOrCode) return PARTY_THEMES.ind;
  const s = partyOrCode.toLowerCase().trim();

  // BJP Check (Saffron)
  if (s.includes("bjp") || s.includes("bharatiya") || s.includes("বিজেপি") || s.includes("janata")) {
    return PARTY_THEMES.bjp;
  }

  // TMC Check (Green)
  if (
    s.includes("tmc") ||
    s.includes("aitc") ||
    s.includes("trinamool") ||
    s.includes("তৃণমূল") ||
    s.includes("ghas phul")
  ) {
    return PARTY_THEMES.tmc;
  }

  // Congress Check (Blue)
  if (s.includes("cong") || s.includes("inc") || s.includes("কংগ্রেস") || s.includes("congress")) {
    return PARTY_THEMES.cong;
  }

  // CPIM Check (Red)
  if (
    s.includes("cpim") ||
    s.includes("cpi(m)") ||
    s.includes("cpm") ||
    s.includes("marxist") ||
    s.includes("communist") ||
    s.includes("সিপিআইএম") ||
    s.includes("বামফ্রন্ট")
  ) {
    return PARTY_THEMES.cpim;
  }

  // Default to Independent / Others
  return PARTY_THEMES.ind;
}

// Local storage key for instant client-side persistence and fallback
const STORAGE_KEY_PARTY_OVERRIDES = "bagula2_member_party_overrides_v1";

export function getLocalPartyOverrides(): Record<number, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARTY_OVERRIDES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalPartyOverride(wardNumber: number, partyCode: string): void {
  try {
    const current = getLocalPartyOverrides();
    current[wardNumber] = partyCode;
    localStorage.setItem(STORAGE_KEY_PARTY_OVERRIDES, JSON.stringify(current));
    // Dispatch storage event so other open tabs/components re-render instantly
    window.dispatchEvent(new CustomEvent("member-party-updated", { detail: { wardNumber, partyCode } }));
  } catch (e) {
    console.error("Failed to save local party override", e);
  }
}

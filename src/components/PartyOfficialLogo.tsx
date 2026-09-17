import React, { useState } from "react";
import {
  type PartyColorTheme,
  getPartyColorConfig,
} from "@/lib/partyColorConfig";

interface PartyOfficialLogoProps {
  theme?: PartyColorTheme;
  partyCode?: string | null;
  partyName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTooltip?: boolean;
  withRing?: boolean;
}

const SIZE_MAP = {
  xs: {
    container: "w-4 h-4",
    img: "w-3.5 h-3.5",
    icon: 12,
  },
  sm: {
    container: "w-5 h-5",
    img: "w-4 h-4",
    icon: 14,
  },
  md: {
    container: "w-6 h-6",
    img: "w-5 h-5",
    icon: 16,
  },
  lg: {
    container: "w-8 h-8",
    img: "w-6 h-6",
    icon: 20,
  },
  xl: {
    container: "w-10 h-10",
    img: "w-8 h-8",
    icon: 26,
  },
};

/**
 * Built-in crisp SVG Vector Party Symbols as fallback / guarantee
 * Ensures official symbols render flawlessly in any browser / network condition.
 */
function FallbackPartySymbol({
  keyTheme,
  sizePx = 16,
}: {
  keyTheme: string;
  sizePx: number;
}) {
  switch (keyTheme) {
    case "bjp":
      // BJP Lotus Flower vector
      return (
        <svg
          viewBox="0 0 24 24"
          width={sizePx}
          height={sizePx}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-orange-600 shrink-0"
        >
          <path
            d="M12 3C12 3 13.8 6.5 13.8 9C13.8 10 13 11 12 11C11 11 10.2 10 10.2 9C10.2 6.5 12 3 12 3Z"
            fill="#EA580C"
          />
          <path
            d="M8.5 7.5C8.5 7.5 10 10.2 10.5 11.5C9.5 12 8.5 11.8 7.5 10.8C6.5 9.8 8.5 7.5 8.5 7.5Z"
            fill="#F97316"
          />
          <path
            d="M15.5 7.5C15.5 7.5 14 10.2 13.5 11.5C14.5 12 15.5 11.8 16.5 10.8C17.5 9.8 15.5 7.5 15.5 7.5Z"
            fill="#F97316"
          />
          <path
            d="M5 12C5 12 7.5 13 9 13.2C8.5 14.5 7.2 15 5.8 14.2C4.5 13.5 5 12 5 12Z"
            fill="#FB923C"
          />
          <path
            d="M19 12C19 12 16.5 13 15 13.2C15.5 14.5 16.8 15 18.2 14.2C19.5 13.5 19 12 19 12Z"
            fill="#FB923C"
          />
          <path
            d="M6 16.5C8 16 12 15.5 12 15.5C12 15.5 16 16 18 16.5C16.5 19 13.5 19.5 12 19.5C10.5 19.5 7.5 19 6 16.5Z"
            fill="#16A34A"
          />
          <path
            d="M12 17V21M9 20H15"
            stroke="#15803D"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case "tmc":
      // AITC Twin grass flowers vector
      return (
        <svg
          viewBox="0 0 24 24"
          width={sizePx}
          height={sizePx}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-emerald-600 shrink-0"
        >
          <path
            d="M8.5 4C8.5 4 10 5.5 10 7C10 8 9.2 8.8 8.2 8.8C7.2 8.8 6.5 8 6.5 7C6.5 5.5 8.5 4 8.5 4Z"
            fill="#16A34A"
          />
          <path
            d="M15.5 3C15.5 3 17 4.5 17 6C17 7 16.2 7.8 15.2 7.8C14.2 7.8 13.5 7 13.5 6C13.5 4.5 15.5 3 15.5 3Z"
            fill="#15803D"
          />
          <path
            d="M8.2 8.8C8.2 8.8 8 13 8.5 16M15.2 7.8C15.2 7.8 15 12.5 14.5 16"
            stroke="#15803D"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M4.5 18C7.5 16 11 16 13 16C16 16 18 16.8 19.5 18"
            stroke="#16A34A"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 19C9 18 13 18 18 19"
            stroke="#22C55E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8.5" cy="6.5" r="1" fill="#FEF08A" />
          <circle cx="15.5" cy="5.5" r="1" fill="#FEF08A" />
        </svg>
      );

    case "cong":
      // INC Open Hand vector
      return (
        <svg
          viewBox="0 0 24 24"
          width={sizePx}
          height={sizePx}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-blue-600 shrink-0"
        >
          <rect width="24" height="24" rx="12" fill="#2563EB" fillOpacity="0.1" />
          <path
            d="M7 11V8.5C7 7.7 7.7 7 8.5 7C9.3 7 10 7.7 10 8.5V11M10 8.5V6C10 5.2 10.7 4.5 11.5 4.5C12.3 4.5 13 5.2 13 6V11M13 6.5V7.5C13 6.7 13.7 6 14.5 6C15.3 6 16 6.7 16 7.5V12M16 8.5C16 7.7 16.7 7 17.5 7C18.3 7 19 7.7 19 8.5V14C19 17.3 16.3 20 13 20C10.5 20 8.3 18.5 7.4 16.2L6.2 13.2C5.9 12.5 6.2 11.6 6.9 11.2C7.6 10.9 8.5 11.2 8.8 11.9L9.5 13.5"
            stroke="#2563EB"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "cpim":
      // CPI(M) Hammer, sickle and star vector
      return (
        <svg
          viewBox="0 0 24 24"
          width={sizePx}
          height={sizePx}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-rose-600 shrink-0"
        >
          <rect width="24" height="24" rx="12" fill="#DC2626" fillOpacity="0.12" />
          {/* Five pointed star */}
          <path
            d="M12 4L13.1 6.8L16 7.1L13.8 9L14.5 11.8L12 10.3L9.5 11.8L10.2 9L8 7.1L10.9 6.8L12 4Z"
            fill="#DC2626"
          />
          {/* Sickle */}
          <path
            d="M17.5 13C16.8 10.8 14.5 9.2 12 9.2C10.2 9.2 8.6 10.1 7.7 11.5C6.8 12.9 6.7 14.7 7.5 16.2C8.3 17.7 10 18.5 11.8 18.5C12.3 18.5 12.9 18.4 13.4 18.2"
            stroke="#DC2626"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Hammer head & handle */}
          <line
            x1="9"
            y1="19"
            x2="15.5"
            y2="12.5"
            stroke="#DC2626"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <rect
            x="14"
            y="10"
            width="3.5"
            height="2.5"
            rx="0.5"
            transform="rotate(45 14 10)"
            fill="#DC2626"
          />
        </svg>
      );

    default:
      // Independent / Others symbol
      return (
        <svg
          viewBox="0 0 24 24"
          width={sizePx}
          height={sizePx}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-slate-600 shrink-0"
        >
          <circle cx="12" cy="12" r="9" stroke="#475569" strokeWidth="1.5" />
          <path
            d="M12 7L13.5 10.5L17 11L14.5 13.5L15.2 17L12 15.2L8.8 17L9.5 13.5L7 11L10.5 10.5L12 7Z"
            fill="#475569"
          />
        </svg>
      );
  }
}

export function PartyOfficialLogo({
  theme,
  partyCode,
  partyName,
  size = "sm",
  className = "",
  showTooltip = true,
  withRing = false,
}: PartyOfficialLogoProps) {
  const activeTheme = theme || getPartyColorConfig(partyCode || partyName);
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZE_MAP[size];

  const hasLogoUrl = Boolean(activeTheme.logoUrl && !imgError);

  const ringStyle = withRing
    ? `ring-1.5 ring-offset-1 ring-${activeTheme.colorName}-400`
    : "";

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full bg-white border border-slate-200/90 shadow-2xs overflow-hidden transition-transform hover:scale-105 ${sizeConfig.container} ${ringStyle} ${className}`}
      title={
        showTooltip
          ? `${activeTheme.shortLabel} (${activeTheme.fullName}) — Symbol: ${activeTheme.symbol}`
          : undefined
      }
      aria-label={`${activeTheme.shortLabel} logo`}
    >
      {hasLogoUrl ? (
        <img
          src={activeTheme.logoUrl}
          alt={`${activeTheme.shortLabel} logo`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`object-contain ${sizeConfig.img}`}
          loading="lazy"
        />
      ) : (
        <FallbackPartySymbol
          keyTheme={activeTheme.key}
          sizePx={sizeConfig.icon}
        />
      )}
    </span>
  );
}

/**
 * Enhanced Chip showing both the official party logo and the color-coded name badge
 */
export function PartyLogoBadge({
  theme,
  partyCode,
  partyName,
  size = "sm",
  className = "",
  isWinningParty = false,
}: {
  theme?: PartyColorTheme;
  partyCode?: string | null;
  partyName?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  isWinningParty?: boolean;
}) {
  const activeTheme = theme || getPartyColorConfig(partyCode || partyName);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-2xs transition-all ${activeTheme.badgeClass} ${
        isWinningParty ? "ring-2 ring-amber-400 font-bold bg-amber-50/50" : ""
      } ${className}`}
    >
      <PartyOfficialLogo
        theme={activeTheme}
        size={size === "md" ? "sm" : "xs"}
        showTooltip={false}
      />
      <span className="font-bold text-[11px] leading-none whitespace-nowrap">
        {activeTheme.shortLabel}
      </span>
      {isWinningParty && (
        <span
          className="text-[10px] bg-amber-400 text-amber-950 font-extrabold px-1 rounded leading-tight"
          title="Winning / Majority Party"
        >
          🏆
        </span>
      )}
    </span>
  );
}

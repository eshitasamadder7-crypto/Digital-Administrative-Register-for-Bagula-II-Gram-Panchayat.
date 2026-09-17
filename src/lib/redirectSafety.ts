/**
 * Safe Redirect Engine for Bagula II Gram Panchayat Portal
 * Enforces strict validation on outbound and internal destinations.
 * Rejects unsafe schemes: javascript:, data:, vbscript:, file:, etc.
 */

export type DestinationType =
  | "INTERNAL_ROUTE"
  | "EXTERNAL_URL"
  | "DOCUMENT"
  | "WORKFLOW_STEP"
  | "NO_REDIRECT";

export interface RedirectValidationResult {
  isSafe: boolean;
  destinationType: DestinationType;
  sanitizedUrl: string;
  isExternal: boolean;
  hostname?: string;
  errorMessage?: string;
}

// Strictly forbidden schemes
const DANGEROUS_SCHEMES = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
];

/**
 * Validate and categorize a redirect destination
 */
export function validateRedirectDestination(rawUrl: string | null | undefined): RedirectValidationResult {
  if (!rawUrl || rawUrl.trim() === "" || rawUrl === "#") {
    return {
      isSafe: true,
      destinationType: "NO_REDIRECT",
      sanitizedUrl: "#",
      isExternal: false,
    };
  }

  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  // 1. Reject dangerous URI schemes
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return {
        isSafe: false,
        destinationType: "NO_REDIRECT",
        sanitizedUrl: "#",
        isExternal: false,
        errorMessage: `Forbidden URL scheme detected (${scheme}). Redirect blocked for citizen security.`,
      };
    }
  }

  // 2. Check for internal routing
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const isDoc = /\.(pdf|docx?|xlsx?|jpg|jpeg|png)$/i.test(trimmed);
    return {
      isSafe: true,
      destinationType: isDoc ? "DOCUMENT" : "INTERNAL_ROUTE",
      sanitizedUrl: trimmed,
      isExternal: false,
    };
  }

  // 3. Protocol relative URL like //example.com is unsafe/ambiguous -> enforce explicit https
  if (trimmed.startsWith("//")) {
    return {
      isSafe: false,
      destinationType: "NO_REDIRECT",
      sanitizedUrl: "#",
      isExternal: true,
      errorMessage: "Protocol-relative URLs are not permitted.",
    };
  }

  // 4. Parse absolute URL
  try {
    const parsed = new URL(trimmed);

    // Only allow http: and https: protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isSafe: false,
        destinationType: "NO_REDIRECT",
        sanitizedUrl: "#",
        isExternal: false,
        errorMessage: `Unsupported protocol ${parsed.protocol}. Only HTTPS / HTTP destinations are permitted.`,
      };
    }

    const isDoc = /\.(pdf|docx?|xlsx?)$/i.test(parsed.pathname);

    return {
      isSafe: true,
      destinationType: isDoc ? "DOCUMENT" : "EXTERNAL_URL",
      sanitizedUrl: parsed.toString(),
      isExternal: true,
      hostname: parsed.hostname,
    };
  } catch {
    // Malformed URL
    return {
      isSafe: false,
      destinationType: "NO_REDIRECT",
      sanitizedUrl: "#",
      isExternal: false,
      errorMessage: "Invalid or malformed URL syntax.",
    };
  }
}

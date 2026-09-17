/**
 * Safely validates an admin redirect target ensuring it stays on the same origin.
 * Rejects protocol-relative, backslash-authority bypasses, and cross-origin navigations.
 */
export function validateAdminRedirect(raw: string | null, currentOrigin: string): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();

  // Explicitly reject obvious protocol-relative strings and backslash evasion tricks
  // Note: in TypeScript, \ represents a single literal backslash in the string.
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("\\") ||
    trimmed.startsWith("/\\") ||
    trimmed.startsWith("\\/")
  ) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, currentOrigin);

    // Must remain on the exact same origin
    if (parsed.origin !== currentOrigin) {
      return null;
    }

    // Must be an HTTP/HTTPS scheme (no javascript: or data:)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Crucial: The extracted path must NOT begin with //, otherwise assigning
    // it to window.location.replace() behaves as a protocol-relative redirect.
    // e.g. https://origin.com//attacker.example -> pathname is //attacker.example
    const relative = parsed.pathname + parsed.search + parsed.hash;

    // Check for 2 forward slashes or a single backslash at start of the resulting path
    if (relative.startsWith("//")) {
      return null;
    }

    // Return the safe relative path
    return relative;
  } catch {
    return null; // URL parsing failed
  }
}

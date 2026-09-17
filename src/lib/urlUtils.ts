export function isSafeRedirect(targetUrl: string, client?: unknown): boolean {
  if (!targetUrl) return false;

  let parsedTarget: URL;
  try {
    // If targetUrl is relative, it will use window.location.origin
    parsedTarget = new URL(targetUrl, window.location.origin);
  } catch {
    return false; // Malformed URL
  }

  // Reject explicitly dangerous schemes
  if (['javascript:', 'data:', 'vbscript:'].includes(parsedTarget.protocol)) {
    return false;
  }
  // Allow only http: or https:
  if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
      return false;
  }

  if (client) {
    // The client object has redirect_uris array based on Supabase type inspection
    const allowedUris = client.redirect_uris;
    if (!Array.isArray(allowedUris)) {
      return false;
    }

    // Must strictly match one of the allowed URIs' scheme, hostname, port, and pathname
    for (const allowedUri of allowedUris) {
      try {
        const parsedAllowed = new URL(allowedUri);
        if (
          parsedTarget.protocol === parsedAllowed.protocol &&
          parsedTarget.hostname === parsedAllowed.hostname &&
          parsedTarget.port === parsedAllowed.port &&
          parsedTarget.pathname === parsedAllowed.pathname
        ) {
          return true; // Query and hash fragments are allowed per OAuth spec
        }
      } catch {
        continue;
      }
    }
    return false;
  } else {
    // If client is missing, we only allow same-origin redirects
    // e.g. targetUrl = "/admin?next=..." => parsedTarget.origin === window.location.origin
    if (parsedTarget.origin === window.location.origin) {
        // Also reject protocol-relative URLs manually just in case, but URL constructor handles them
        return true;
    }
    return false;
  }
}

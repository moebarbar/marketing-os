import { setAuthTokenGetter } from "@workspace/api-client-react";

// Single choke point for API auth. Covers both the generated React Query
// client (via setAuthTokenGetter) and the many direct fetch("…/api/…") calls
// across pages (via a window.fetch wrapper), so every request carries the
// session token without threading headers through every call site.

const getToken = () => localStorage.getItem("auth_token");

setAuthTokenGetter(() => getToken());

const isApiRequest = (url: string): boolean => {
  try {
    const resolved = new URL(url, window.location.origin);
    return resolved.origin === window.location.origin && resolved.pathname.includes("/api/");
  } catch {
    return false;
  }
};

const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const token = getToken();

  if (token && isApiRequest(url)) {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return originalFetch(input, { ...init, headers });
  }

  return originalFetch(input, init);
};

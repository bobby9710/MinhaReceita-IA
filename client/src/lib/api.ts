const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = rawApiUrl ? rawApiUrl.replace(/\/$/, "") : "";

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/': ${path}`);
  }

  return `${API_BASE_URL}${path}`;
}

type ApiFetchOptions = RequestInit & {
  withAuth?: boolean;
};

export function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { withAuth = true, ...fetchOptions } = options;

  return fetch(buildApiUrl(path), {
    ...fetchOptions,
    credentials: withAuth ? "include" : fetchOptions.credentials,
  });
}

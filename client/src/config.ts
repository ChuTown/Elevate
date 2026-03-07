/**
 * App URL config. Used for OAuth and any origin-dependent behaviour.
 * In dev, Vite proxies /api to the server so use relative /api for requests.
 */
export const appOrigin =
  import.meta.env.VITE_APP_ORIGIN ?? (import.meta.env.DEV ? "http://localhost:5173" : window.location.origin);

/** Base URL for API requests. Empty in dev (same origin via proxy); set in prod if API is on another host. */
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

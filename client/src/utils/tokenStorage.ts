/**
 * Single choke point for reading/writing the JWT. Nothing else in the app
 * should touch localStorage/sessionStorage for the token directly - so if
 * we ever change storage strategy (e.g. to an httpOnly cookie), this is the
 * only file that changes.
 *
 * "Remember me" decides WHICH web storage backs the token:
 *   - remember = true  -> localStorage   (survives closing the browser)
 *   - remember = false -> sessionStorage (cleared when the tab/window closes)
 * Reads check both so an existing session is found regardless of choice.
 */
const TOKEN_KEY = "crm_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, remember = true): void {
  // Clear any prior copy in the other store so exactly one backing exists.
  clearToken();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

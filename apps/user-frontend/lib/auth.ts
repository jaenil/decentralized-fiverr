const TOKEN_KEY = "df_token";

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("df:session-changed"));
}

export function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("df:session-changed"));
}

export function isLoggedIn(): boolean {
  return Boolean(loadToken());
}

const TOKEN_KEY = "dw_token"; // 'w' = worker; separate from user's 'df_token'

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function loadToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(loadToken());
}

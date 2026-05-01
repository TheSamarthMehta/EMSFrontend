const STORAGE_KEY = "spendwise_post_auth_redirect";

export function setPostAuthRedirect(path: string): void {
  try {
    if (!path.startsWith("/")) return;
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // ignore
  }
}

export function peekPostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v && v.startsWith("/") ? v : null;
  } catch {
    return null;
  }
}

export function consumePostAuthRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return v && v.startsWith("/") ? v : null;
  } catch {
    return null;
  }
}

/**
 * Optional sign-in / sign-up email domain allow list.
 *
 * Set `VITE_ALLOWED_EMAIL_DOMAINS` to a comma-separated list (case-insensitive), e.g.
 * `gmail.com,googlemail.com` or `gmail.com,outlook.com,company.com`.
 * Use `*` to explicitly allow every domain.
 * Omit or leave empty to allow any domain (no client-side domain gate).
 *
 * The API should apply the same rules server-side; this is UX + early validation only.
 */

function normalizeDomainToken(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

/** `null` means no restriction; otherwise lowercase hostnames without leading `@`. */
export function getAllowedEmailDomains(): string[] | null {
  const raw = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS;
  if (raw === undefined || raw === null) {
    return null;
  }
  const list = raw
    .split(",")
    .map(normalizeDomainToken)
    .filter(Boolean);
  if (list.length === 0) {
    return null;
  }
  if (list.length === 1 && list[0] === "*") {
    return null;
  }
  return list;
}

export function hasEmailDomainRestriction(): boolean {
  return getAllowedEmailDomains() !== null;
}

export function getEmailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) {
    return null;
  }
  return normalized.slice(at + 1);
}

export function isEmailDomainAllowed(email: string): boolean {
  const allowed = getAllowedEmailDomains();
  if (!allowed) {
    return true;
  }
  const domain = getEmailDomain(email);
  if (!domain) {
    return false;
  }
  return allowed.includes(domain);
}

export function formatAllowedDomainsForMessage(): string {
  const allowed = getAllowedEmailDomains();
  if (!allowed?.length) {
    return "";
  }
  return allowed.join(", ");
}

export function emailDomainNotAllowedMessage(): string {
  const list = formatAllowedDomainsForMessage();
  if (!list) {
    return "This email domain is not allowed.";
  }
  return `Use an email address at one of these domains: ${list}`;
}

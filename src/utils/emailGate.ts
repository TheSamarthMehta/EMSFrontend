const EMAIL_OTP_PENDING_KEY = "ems_email_otp_pending";
const EMAIL_OTP_VERIFIED_KEY = "ems_email_otp_verified";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function markEmailOtpPending(email: string): void {
  if (!email) return;
  const normalized = normalizeEmail(email);
  sessionStorage.setItem(EMAIL_OTP_PENDING_KEY, normalized);
  sessionStorage.removeItem(EMAIL_OTP_VERIFIED_KEY);
}

export function getPendingEmailOtp(): string | null {
  const value = sessionStorage.getItem(EMAIL_OTP_PENDING_KEY);
  return value ? normalizeEmail(value) : null;
}

export function clearEmailOtpState(): void {
  sessionStorage.removeItem(EMAIL_OTP_PENDING_KEY);
  sessionStorage.removeItem(EMAIL_OTP_VERIFIED_KEY);
}

export function markEmailOtpVerified(email: string): void {
  if (!email) return;
  const normalized = normalizeEmail(email);
  sessionStorage.setItem(EMAIL_OTP_VERIFIED_KEY, normalized);
  sessionStorage.removeItem(EMAIL_OTP_PENDING_KEY);
}

export function isEmailOtpVerifiedFor(email: string): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  const verifiedFor = sessionStorage.getItem(EMAIL_OTP_VERIFIED_KEY);
  return normalizeEmail(verifiedFor || "") === normalized;
}

export function hasPendingEmailOtpFor(email: string): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return getPendingEmailOtp() === normalized;
}

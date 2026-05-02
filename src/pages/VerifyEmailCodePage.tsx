import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Loader2, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { refreshClient } from "@/api/client";
import { getMe, sendSignInEmailOtp, verifySignInEmailOtp } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types/user";
import {
  getPendingEmailOtp,
  hasPendingEmailOtpFor,
  isEmailOtpVerifiedFor,
  markEmailOtpPending,
  markEmailOtpVerified,
} from "@/utils/emailGate";
import { useAuthStore } from "@/store/authStore";
import { clearAuthIntent } from "@/utils/authIntent";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { consumePostAuthRedirect } from "@/utils/postAuthRedirect";
import { toast } from "sonner";

function nextPathAfterAuth(sessionUser: PublicUser | undefined | null): string {
  const pending = consumePostAuthRedirect();
  if (pending) {
    return pending;
  }
  return sessionUser?.isProfileComplete ? "/dashboard" : "/complete-profile";
}

const OTP_LENGTH = 6;
/** Must match backend `OTP_TTL_MINUTES` (email + server). */
const EMAIL_CODE_TTL_MINUTES = 10;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function ExpenseLogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3b82f6]",
        className
      )}
      aria-hidden
    >
      <svg width={28} height={28} viewBox="0 0 28 28" className="block">
        <rect x="5" y="17" width="18" height="3" rx="1" fill="#ffffff" fillOpacity="0.95" />
        <rect x="4" y="12.5" width="20" height="3" rx="1" fill="#ffffff" fillOpacity="0.98" />
        <rect x="3" y="8" width="22" height="3" rx="1" fill="#ffffff" />
      </svg>
    </div>
  );
}

export default function VerifyEmailCodePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cachedSessionUser = queryClient.getQueryData<PublicUser>(["session"]);

  const pendingEmail = getPendingEmailOtp();
  const resolvedEmail = useMemo(() => {
    const primary = cachedSessionUser?.email || pendingEmail || "";
    return normalizeEmail(primary);
  }, [cachedSessionUser?.email, pendingEmail]);
  const resolvedName = useMemo(
    () => cachedSessionUser?.name || "there",
    [cachedSessionUser?.name]
  );

  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [countdown, setCountdown] = useState<number>(30);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mailHint, setMailHint] = useState<string>("");
  const [sessionProbeDone, setSessionProbeDone] = useState<boolean>(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array.from({ length: OTP_LENGTH }, () => null));
  const sentOnceRef = useRef<boolean>(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  /** Restore JWT + refresh cookie after a cold start before deciding there is no account. */
  useEffect(() => {
    let cancelled = false;
    const sessionNow = queryClient.getQueryData<PublicUser>(["session"]);
    const hasEmailHint =
      Boolean(normalizeEmail(sessionNow?.email || "")) || Boolean(getPendingEmailOtp());
    if (hasEmailHint) {
      setSessionProbeDone(true);
      return;
    }
    void (async () => {
      try {
        const { data } = await refreshClient.post<{ accessToken: string }>("/auth/refresh-token");
        if (cancelled) {
          return;
        }
        useAuthStore.getState().setAccessToken(data.accessToken);
        const user = await getMe();
        if (cancelled) {
          return;
        }
        queryClient.setQueryData(["session"], user);
        if (user.isEmailVerified && user.email) {
          markEmailOtpVerified(user.email);
          navigate(nextPathAfterAuth(user), { replace: true });
          return;
        }
        if (user.email) {
          markEmailOtpPending(user.email);
        }
      } catch {
        // No valid refresh session — user must sign in again.
      } finally {
        if (!cancelled) {
          setSessionProbeDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!sessionProbeDone || !resolvedEmail) {
      return;
    }
    inputRefs.current[0]?.focus();
  }, [resolvedEmail, sessionProbeDone]);

  useEffect(() => {
    if (!sessionProbeDone) {
      return;
    }
    const sessionUser = queryClient.getQueryData<PublicUser>(["session"]);
    if (!resolvedEmail) {
      navigate("/login", { replace: true });
      return;
    }
    if (sessionUser?.isEmailVerified || isEmailOtpVerifiedFor(resolvedEmail)) {
      navigate(nextPathAfterAuth(sessionUser), { replace: true });
      return;
    }
    if (!hasPendingEmailOtpFor(resolvedEmail)) {
      markEmailOtpPending(resolvedEmail);
    }
  }, [navigate, queryClient, resolvedEmail, sessionProbeDone]);

  const sendCode = async (): Promise<void> => {
    if (!resolvedEmail) {
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      const result = await sendSignInEmailOtp({
        email: resolvedEmail,
        name: resolvedName,
      });
      setMailHint(result.emailMasked);
      setCountdown(30);
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      inputRefs.current[0]?.focus();
      toast.success("Verification code sent", {
        description: `Check ${result.emailMasked}`,
      });
      if (result.previewCode) {
        toast.info(`Dev code: ${result.previewCode}`);
      }
    } catch (sendError: unknown) {
      setError(getApiErrorMessage(sendError, "Unable to send code"));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!sessionProbeDone || !resolvedEmail || sentOnceRef.current) {
      return;
    }
    const sessionUser = queryClient.getQueryData<PublicUser>(["session"]);
    if (sessionUser?.isEmailVerified) {
      return;
    }
    sentOnceRef.current = true;
    void sendCode();
  }, [navigate, queryClient, resolvedEmail, sessionProbeDone]);

  const otpValue = useMemo(() => digits.join(""), [digits]);

  const handleChange = (index: number, value: string): void => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setDigits((prev) => prev.map((digit, i) => (i === index ? "" : digit)));
      return;
    }

    const nextDigits = [...digits];
    for (let i = 0; i < numeric.length && index + i < OTP_LENGTH; i += 1) {
      nextDigits[index + i] = numeric[i] ?? "";
    }
    setDigits(nextDigits);
    const nextIndex = Math.min(index + numeric.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>): void => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? ""));
    const focusIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    if (focusIndex >= 0) {
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = async (): Promise<void> => {
    if (!resolvedEmail) return;
    setError(null);
    if (otpValue.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setIsVerifying(true);
    try {
      const verifyResult = await verifySignInEmailOtp({
        email: resolvedEmail,
        code: otpValue,
      });
      const setAccessToken = useAuthStore.getState().setAccessToken;
      if (!verifyResult.accessToken || !verifyResult.user) {
        setError("Unable to start a server session. Please sign in again.");
        return;
      }
      setAccessToken(verifyResult.accessToken);
      queryClient.setQueryData(["session"], verifyResult.user);
      const sessionUser = queryClient.getQueryData<PublicUser>(["session"]);
      markEmailOtpVerified(resolvedEmail);
      clearAuthIntent();
      toast.success("Email verified");
      navigate(nextPathAfterAuth(sessionUser), { replace: true });
    } catch (verifyError: unknown) {
      setError(getApiErrorMessage(verifyError, "Verification failed"));
    } finally {
      setIsVerifying(false);
    }
  };

  const shellClass =
    "relative min-h-screen min-h-[100dvh] overflow-hidden bg-[#0b1220] px-4 py-8 sm:px-6";

  if (!sessionProbeDone) {
    return (
      <div className={shellClass}>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-8%,rgba(59,130,246,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" aria-hidden />
          <p className="text-sm text-slate-400">Restoring your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-8%,rgba(59,130,246,0.1),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[380px] sm:max-w-[420px] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full overflow-hidden rounded-[20px] border border-[#1f2b45] bg-[#0f1a2e] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        >
          <div className="px-5 pb-2 pt-6 sm:px-6 sm:pt-7">
            <div className="flex items-start gap-4">
              <ExpenseLogoMark />
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {APP_NAME}
                </p>
                <p className="mt-2 text-sm text-[#93c5fd]">Welcome to your account</p>
              </div>
            </div>

            <h1 className="mt-5 text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl">
              Your secure sign-in code
            </h1>

            <div className="mt-4 h-px w-full bg-[#1f2b45]" aria-hidden />

            <p className="mt-4 text-xs leading-[1.6] text-slate-200 sm:text-sm">
              Hi {resolvedName}, welcome back! We received a request to sign in to your {APP_NAME}{" "}
              account. Use the one-time code below to complete your login.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Code sent to{" "}
              <span className="font-medium text-slate-200">{mailHint || resolvedEmail}</span>
            </p>
          </div>

          <div className="px-5 sm:px-6">
            <div className="rounded-xl border border-[#1f2b45] bg-[rgba(8,15,30,0.55)] px-3.5 pb-4 pt-4 sm:px-4">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#93c5fd]">
                One-time passcode
              </p>
              <div className="mt-4 flex justify-center gap-1.5 sm:gap-2">
                {digits.map((digit, index) => (
                  <Input
                    key={`email-otp-${index}`}
                    ref={(el) => {
                      inputRefs.current[index] = el as HTMLInputElement | null;
                    }}
                    value={digit}
                    inputMode="numeric"
                    maxLength={1}
                    onPaste={handlePaste}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onChange={(event) => handleChange(index, event.target.value)}
                    variant="onDark"
                    className={cn(
                      "max-w-10 shrink-0 px-0 text-center font-mono text-lg font-bold text-white !h-10 !w-10 rounded-md",
                      "focus-visible:border-[#3b82f6]/50 focus-visible:ring-[3px] focus-visible:ring-[#3b82f6]/25"
                    )}
                    aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Clock className="h-[18px] w-[18px] shrink-0 text-[#f59e0b]" strokeWidth={1.75} aria-hidden />
                <span className="text-[13px] font-semibold text-[#f59e0b]">
                  Expires in {EMAIL_CODE_TTL_MINUTES} minutes
                </span>
              </div>
            </div>
          </div>

          <div className="min-h-[2.5rem] px-6 sm:px-8">
            <AnimatePresence initial={false}>
              {error ? (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="mt-5 px-6 sm:px-8">
            <div className="overflow-hidden rounded-xl border border-[#3b82f6]/20 bg-[rgba(59,130,246,0.06)]">
              <div className="flex">
                <div className="w-1 shrink-0 bg-[#3b82f6]" aria-hidden />
                <div className="px-4 py-4 sm:px-5">
                  <p className="text-[15px] font-bold text-white">Security reminder</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    This code is personal and confidential. Our support team will never ask you for it.
                    If you did not initiate this request, your account is safe — simply disregard this
                    message.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 px-6 pb-2 sm:flex-row sm:items-center sm:px-8">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />
              </div>
              <span className="text-sm font-semibold text-slate-200">256-bit encryption</span>
            </div>
            <div className="flex flex-1 items-center gap-3">
              <Shield className="h-6 w-6 shrink-0 text-[#3b82f6]" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-semibold text-slate-200">Zero-trust authentication</span>
            </div>
          </div>

          <div className="mt-6 px-6 sm:px-8">
            <Button
              type="button"
              onClick={() => void handleVerify()}
              disabled={isVerifying || isSending}
              className="h-12 w-full rounded-xl bg-[#3b82f6] text-base font-semibold text-white shadow-[0_12px_32px_rgba(59,130,246,0.28)] hover:bg-[#2563eb] disabled:opacity-60"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Verify and continue"
              )}
            </Button>
            <div className="mt-4 text-center text-xs text-slate-500">
              {countdown > 0 ? (
                <span>Resend code in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={isSending}
                  className="font-semibold text-[#93c5fd] transition-colors hover:text-[#bfdbfe] disabled:opacity-60"
                >
                  {isSending ? "Sending…" : "Resend verification code"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-[#1f2b45] bg-[#0a1222] px-6 py-6 sm:px-8">
            <p className="text-center text-xs leading-relaxed text-slate-500">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-1 text-xs text-slate-500">
              <Link to="/terms" className="px-2 py-1 text-slate-400 transition-colors hover:text-slate-300">
                Privacy Policy
              </Link>
              <span className="text-slate-600" aria-hidden>
                |
              </span>
              <Link
                to="/login"
                className="px-2 py-1 text-slate-400 transition-colors hover:text-slate-300"
                title="Sign in to manage notification preferences"
              >
                Unsubscribe
              </Link>
              <span className="text-slate-600" aria-hidden>
                |
              </span>
              <Link to="/login" className="px-2 py-1 text-slate-400 transition-colors hover:text-slate-300">
                Help
              </Link>
            </nav>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

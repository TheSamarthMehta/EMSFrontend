import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OTPVerifyProps {
  phone: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onSuccess: () => void;
}

const OTP_LENGTH = 6;

export function OTPVerify({
  phone,
  onVerify,
  onResend,
  onSuccess,
}: OTPVerifyProps) {
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [countdown, setCountdown] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array.from({ length: OTP_LENGTH }, () => null));
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otpValue = useMemo(() => digits.join(""), [digits]);

  const setDigitAt = (index: number, value: string): void => {
    setDigits((prev) => prev.map((digit, i) => (i === index ? value : digit)));
  };

  const handleChange = (index: number, value: string): void => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setDigitAt(index, "");
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

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>): void => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    if (focusIndex >= 0) {
      inputRefs.current[focusIndex]?.focus();
    }
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

  const handleVerify = async (): Promise<void> => {
    setError(null);
    if (otpValue.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setIsVerifying(true);
    try {
      await onVerify(otpValue);
      onSuccess();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Failed to verify OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (countdown > 0) return;
    setError(null);
    setIsResending(true);
    try {
      await onResend();
      setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
      setCountdown(30);
      inputRefs.current[0]?.focus();
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Verify your number</h3>
        <p className="mt-1 text-sm text-white/60">OTP sent to {phone}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {digits.map((digit, index) => (
          <Input
            key={`otp-${index}`}
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
            className="max-w-10 min-w-0 shrink-0 px-0 text-center text-lg text-white !w-10"
          />
        ))}
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <Button
        type="button"
        onClick={() => void handleVerify()}
        disabled={isVerifying}
        className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-full rounded-md text-sm"
      >
        {isVerifying ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </span>
        ) : (
          "Verify OTP"
        )}
      </Button>

      <div className="text-center text-xs text-white/60">
        {countdown > 0 ? (
          <span>Resend OTP in {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={isResending}
            className="text-indigo-400 transition-colors hover:text-indigo-300 disabled:opacity-60"
          >
            {isResending ? "Resending..." : "Resend OTP"}
          </button>
        )}
      </div>
    </div>
  );
}

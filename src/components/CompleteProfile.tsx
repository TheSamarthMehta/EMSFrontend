import { useEffect, useMemo, useRef, useState } from "react";
import { type ConfirmationResult, type RecaptchaVerifier } from "firebase/auth";
import { Building2, Loader2, Mail, User } from "lucide-react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AuthBackground from "@/components/AuthBackground";
import { OTPVerify } from "@/components/OTPVerify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/firebase/config";
import { sendOTP, setupRecaptcha, verifyOTP } from "@/firebase/phoneAuth";

type Step = "profile" | "otp";

const COUNTRY_CODES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "+91", label: "🇮🇳 +91 India" },
  { code: "+1", label: "🇺🇸 +1 USA" },
  { code: "+44", label: "🇬🇧 +44 UK" },
  { code: "+61", label: "🇦🇺 +61 AU" },
  { code: "+971", label: "🇦🇪 +971 UAE" },
];

const CURRENCIES: ReadonlyArray<string> = ["INR", "USD", "EUR", "GBP", "AED"];

const CURRENCY_LABELS: Record<string, string> = {
  INR: "INR — Indian rupee",
  USD: "USD — US dollar",
  EUR: "EUR — Euro",
  GBP: "GBP — British pound",
  AED: "AED — UAE dirham",
};

function normalizePhone(countryCode: string, localPhone: string): string {
  const digits = localPhone.replace(/\D/g, "");
  return `${countryCode}${digits}`;
}

export function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState<string>(user?.displayName ?? "");
  const [email, setEmail] = useState<string>(user?.email ?? "");
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phone, setPhone] = useState<string>("");
  const [currency, setCurrency] = useState<string>(user?.currency ?? "INR");
  const [company, setCompany] = useState<string>(user?.company ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [fullPhone, setFullPhone] = useState<string>("");
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    setName(user?.displayName ?? "");
    setEmail(user?.email ?? "");
    setCurrency(user?.currency ?? "INR");
    setCompany(user?.company ?? "");
  }, [user]);

  useEffect(() => {
    recaptchaRef.current = setupRecaptcha("recaptcha-container");
  }, []);

  const initials = useMemo(() => {
    const source = (name || email || "U").trim();
    const parts = source.split(" ").filter(Boolean);
    if (parts.length === 1) {
      return parts[0]?.slice(0, 2).toUpperCase() || "U";
    }
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }, [email, name]);

  const handleSendOtp = async (): Promise<void> => {
    setError(null);
    if (!user) {
      setError("You must be signed in to complete your profile.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!recaptchaRef.current) {
      setError("Verification service is not ready. Please refresh and try again.");
      return;
    }

    const phoneWithCode = normalizePhone(countryCode, phone);
    setIsSendingOtp(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          photoURL: user.photoURL,
          phone: user.phone ?? null,
          isPhoneVerified: user.isPhoneVerified ?? false,
          isProfileComplete: user.isProfileComplete ?? false,
          provider: user.provider,
          createdAt: serverTimestamp(),
          displayName: name.trim() || user.displayName,
          currency,
          company: company.trim() || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      confirmationRef.current = await sendOTP(phoneWithCode, recaptchaRef.current);
      setFullPhone(phoneWithCode);
      setStep("otp");
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : "Unable to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async (): Promise<void> => {
    if (!user) {
      throw new Error("User session missing. Please sign in again.");
    }
    if (!recaptchaRef.current) {
      throw new Error("Verification service is not ready. Please refresh and try again.");
    }
    const phoneWithCode = normalizePhone(countryCode, phone);
    setFullPhone(phoneWithCode);
    confirmationRef.current = await sendOTP(phoneWithCode, recaptchaRef.current);
  };

  const handleVerifyOtp = async (otp: string): Promise<void> => {
    if (!user) {
      throw new Error("User session missing. Please sign in again.");
    }
    if (!confirmationRef.current) {
      throw new Error("OTP not issued. Please request OTP first.");
    }

    await verifyOTP(confirmationRef.current, otp, user.uid, fullPhone);
  };

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#05050c] px-4 py-8">
        <AuthBackground />
        <div className="relative z-10 mx-auto mt-20 max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 text-white/80">
          Please sign in first to complete your profile.
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05050c] px-4 py-8">
      <AuthBackground />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg items-center justify-center">
        <div className="w-full rounded-3xl border border-indigo-400/20 bg-black/60 p-6 shadow-[0_0_80px_rgba(99,102,241,0.2)] backdrop-blur-2xl sm:p-8">
          {step === "profile" ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold text-white">Almost there 👋</h1>
                <p className="mt-1 text-sm text-white/60">Complete your profile to continue</p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/50 text-xl font-semibold text-white">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white/90">Profile photo synced from your sign-in provider</p>
                  <p className="text-xs text-white/50">You can change this later in settings.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Label variant="onDark" htmlFor="cp-name">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/70" size={18} />
                  <Input
                    id="cp-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    variant="onDark"
                    className="pl-10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label variant="onDark" htmlFor="cp-email">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/70" size={18} />
                  <Input
                    id="cp-email"
                    value={email}
                    disabled
                    onChange={(event) => setEmail(event.target.value)}
                    variant="onDark"
                    className="pl-10 text-white/60"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label variant="onDark">Phone Number</Label>
                <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                  <Select value={countryCode} onValueChange={(value) => setCountryCode(value ?? "+91")}>
                    <SelectTrigger variant="onDark" className="min-w-0 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((entry) => (
                        <SelectItem key={entry.code} value={entry.code}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                    placeholder="Phone number"
                    inputMode="numeric"
                    variant="onDark"
                    className="text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label variant="onDark">Currency</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value ?? "INR")}>
                  <SelectTrigger variant="onDark" className="min-w-0 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {CURRENCY_LABELS[entry] ?? entry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label variant="onDark" htmlFor="cp-company">
                  Company (optional)
                </Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/70" size={18} />
                  <Input
                    id="cp-company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    variant="onDark"
                    className="pl-10 text-white"
                  />
                </div>
              </div>

              {error ? <p className="text-xs text-red-400">{error}</p> : null}

              <Button
                type="button"
                onClick={() => void handleSendOtp()}
                disabled={isSendingOtp}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-full rounded-md text-sm"
              >
                {isSendingOtp ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  "Continue →"
                )}
              </Button>

              <p className="text-[11px] text-white/50">
                By continuing, verification will send an OTP SMS to your phone.
              </p>
              <div id="recaptcha-container" />
            </div>
          ) : (
            <OTPVerify
              phone={fullPhone}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onSuccess={() => {
                navigate("/dashboard", { replace: true });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

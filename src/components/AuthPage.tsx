import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  PieChart,
  Shield,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { z } from "zod";
import { postLogin, postRegister } from "@/api/auth";
import AuthBackground from "@/components/AuthBackground";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useTypewriter } from "@/hooks/useTypewriter";
import { auth } from "@/firebase/config";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { setAuthIntent } from "@/utils/authIntent";
import { markEmailOtpPending } from "@/utils/emailGate";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { getPasswordStrength } from "@/utils/passwordStrength";
import {
  TERMS_ACCEPTANCE_EVENT_KEY,
  hasAcceptedTerms,
  setTermsAcceptedInCurrentTab,
} from "@/utils/termsAcceptance";
import { toast } from "sonner";
type AuthTab = "signin" | "signup";

interface AuthPageProps {
  initialTab?: AuthTab;
}

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[0-9]/, "One number")
      .regex(/[^A-Za-z0-9]/, "One special character"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    terms: z.boolean().refine((value) => value === true, "You must accept the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function getMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error, fallback);
}

export default function AuthPage({ initialTab = "signin" }: AuthPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const { clearError } = useAuth();

  const [tab, setTab] = useState<AuthTab>(initialTab);

  const [signInEmail, setSignInEmail] = useState<string>("");
  const [signInPassword, setSignInPassword] = useState<string>("");
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [signUpEmail, setSignUpEmail] = useState<string>("");
  const [signUpPassword, setSignUpPassword] = useState<string>("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState<string>("");
  const [showSignUpPassword, setShowSignUpPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(hasAcceptedTerms());
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const refreshTermsState = (): void => {
      setAcceptedTerms(hasAcceptedTerms());
    };

    const onStorage = (event: StorageEvent): void => {
      if (event.key === null || event.key === TERMS_ACCEPTANCE_EVENT_KEY) {
        setTermsAcceptedInCurrentTab();
        setAcceptedTerms(true);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshTermsState);
    refreshTermsState();

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshTermsState);
    };
  }, []);

  const typewriterPhrases = useMemo(
    () => [
      "Track every rupee with confidence.",
      "Visualize spending patterns in real time.",
      "Stay ahead with smarter financial decisions.",
    ],
    []
  );

  const subtitle = useTypewriter(typewriterPhrases, 70, 38, 2200);

  const strength = useMemo(() => getPasswordStrength(signUpPassword), [signUpPassword]);

  const signInMutation = useMutation({
    mutationFn: postLogin,
    onSuccess: async (data) => {
      try {
        await signOut(auth);
      } catch {
        // Ignore — avoid a stale Firebase OAuth session skipping backend email OTP.
      }
      setAuthIntent("signin");
      setAccessToken(data.accessToken);
      queryClient.setQueryData(["session"], data.user);
      markEmailOtpPending(data.user.email);
      toast.success("Welcome back");
      navigate("/verify-email-code", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getMessage(error, "Login failed"));
    },
  });

  const signUpMutation = useMutation({
    mutationFn: postRegister,
    onSuccess: async (data) => {
      try {
        await signOut(auth);
      } catch {
        // Ignore — same as email sign-in.
      }
      setAuthIntent("signup");
      setAccessToken(data.accessToken);
      queryClient.setQueryData(["session"], data.user);
      markEmailOtpPending(data.user.email);
      toast.success("Account created");
      navigate("/verify-email-code", { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(getMessage(error, "Registration failed"));
    },
  });

  const goTab = (next: AuthTab): void => {
    clearError();
    setTab(next);
    navigate(next === "signup" ? "/register" : "/login", { replace: true });
  };

  const onSignIn = (): void => {
    const parsed = signInSchema.safeParse({ email: signInEmail, password: signInPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please enter valid credentials");
      return;
    }
    signInMutation.mutate(parsed.data);
  };

  const onSignUp = (): void => {
    const parsed = signUpSchema.safeParse({
      name: fullName,
      email: signUpEmail,
      password: signUpPassword,
      confirmPassword: signUpConfirmPassword,
      terms: acceptedTerms,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please review your details");
      return;
    }
    signUpMutation.mutate({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full overflow-x-hidden bg-[#05050c] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <AuthBackground />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.22),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(124,58,237,0.12),transparent_50%)]" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-2.5rem)] min-h-[calc(100dvh-2.5rem)] w-full max-w-[1100px] xl:max-w-[1200px] grid-cols-1 items-center gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-8 lg:py-4">
        {/* Brand column — desktop */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden min-h-[520px] w-full flex-col justify-center rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/80 via-[#0c0c18] to-violet-950/40 p-6 shadow-[0_0_120px_rgba(99,102,241,0.12)] backdrop-blur-xl lg:flex xl:p-8"
        >
          <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -right-16 bottom-1/4 h-56 w-56 rounded-full bg-violet-500/15 blur-[90px]" />

          <div className="relative flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/30 to-violet-600/20 shadow-[0_0_40px_rgba(99,102,241,0.35)]">
              <TrendingUp className="text-indigo-200" size={20} strokeWidth={1.75} />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-300/80">
                Expense Management System
              </p>
              <h1 className="mt-1 max-w-md font-sans text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl xl:text-3xl">
                Clarity for every{" "}
                <span className="bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                  rupee you move
                </span>
                .
              </h1>
            </div>
          </div>

          <p className="relative mt-4 max-w-md text-xs leading-relaxed text-white/55 sm:text-sm">
            One workspace for personal spending, shared bills, and budgets — with live charts that
            make patterns obvious at a glance.
          </p>

          <ul className="relative mt-6 space-y-2.5">
            {[
              { icon: PieChart, title: "Live analytics", desc: "Cash flow and categories update as you spend." },
              { icon: Zap, title: "Split expenses fairly", desc: "Groups, balances, and shared history built in." },
              { icon: Shield, title: "Private by design", desc: "Sessions and tokens handled with care." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.4 }}
                className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-200">
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{title}</p>
                  <p className="mt-0.5 text-xs text-white/45">{desc}</p>
                </div>
              </motion.li>
            ))}
          </ul>

          <div className="relative mt-auto flex items-center gap-2 pt-6 text-[11px] text-white/35">
            <span className="block size-1 rounded-full bg-white/30" aria-hidden />
            <span>Built for speed, clarity, and calm financial habits.</span>
          </div>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[380px] justify-self-center sm:max-w-[420px] lg:justify-self-end"
        >
          <div
            className={cn(
              "auth-glass",
              "relative overflow-hidden rounded-3xl border border-indigo-400/20",
              "bg-[linear-gradient(145deg,rgba(15,15,25,0.92),rgba(8,8,14,0.88))]",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_80px_rgba(0,0,0,0.55),0_0_100px_rgba(99,102,241,0.15)]",
              "backdrop-blur-2xl"
            )}
          >
            <div className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

            <div className="relative p-5 sm:p-6">
              <div className="flex items-start gap-3 lg:hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/35 bg-indigo-600/25 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
                  <TrendingUp className="text-indigo-300" size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">{APP_NAME}</h2>
                  <p className="typewriter-cursor mt-0.5 min-h-[1rem] text-xs text-white/50">{subtitle}</p>
                </div>
              </div>

              <div className="hidden lg:block">
                <h2 className="text-base font-semibold text-white">{APP_NAME}</h2>
                <p className="typewriter-cursor mt-1 min-h-[1rem] text-xs text-white/50">{subtitle}</p>
              </div>

              {/* Segmented control — replaces Tabs to avoid cramped h-8 tab list */}
              <div className="mt-4 flex rounded-xl bg-white/[0.05] p-1 ring-1 ring-white/10 sm:mt-5">
                <button
                  type="button"
                  onClick={() => goTab("signin")}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all duration-300 sm:py-2.5 sm:text-sm",
                    tab === "signin"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-white/45 hover:text-white/75"
                  )}
                >
                  Sign In
                  {tab === "signin" ? (
                    <ArrowRight className="size-3 opacity-80" aria-hidden />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => goTab("signup")}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all duration-300 sm:py-2.5 sm:text-sm",
                    tab === "signup"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-white/45 hover:text-white/75"
                  )}
                >
                  Sign Up
                  {tab === "signup" ? (
                    <ArrowRight className="size-3 opacity-80" aria-hidden />
                  ) : null}
                </button>
              </div>

              <div className="relative mt-4 min-h-0 min-w-0 sm:mt-5">
                <AnimatePresence mode="wait" initial={false}>
                  {tab === "signin" ? (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label variant="onDark" htmlFor="signin-email">
                          Email
                        </Label>
                        <div className="relative min-w-0">
                          <Mail
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 shrink-0 text-indigo-400/70"
                            size={18}
                            aria-hidden
                          />
                          <Input
                            id="signin-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={signInEmail}
                            onChange={(event) => setSignInEmail(event.target.value)}
                            variant="onDark"
                            className="pl-10 pr-11 shadow-inner shadow-black/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label variant="onDark" htmlFor="signin-password">
                          Password
                        </Label>
                        <div className="relative min-w-0">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-indigo-400/70"
                            size={18}
                            aria-hidden
                          />
                          <Input
                            id="signin-password"
                            type={showSignInPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Your password"
                            value={signInPassword}
                            onChange={(event) => setSignInPassword(event.target.value)}
                            variant="onDark"
                            className="pl-10 pr-11 shadow-inner shadow-black/20"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                            onClick={() => setShowSignInPassword((prev) => !prev)}
                            aria-label={showSignInPassword ? "Hide password" : "Show password"}
                          >
                            {showSignInPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          className="text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                          onClick={() => toast.info("Forgot password flow can be added next.")}
                        >
                          Forgot password?
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={onSignIn}
                        disabled={signInMutation.isPending}
                        className="h-9 w-full text-xs shadow-md"
                      >
                        {signInMutation.isPending ? "Signing in…" : "Sign In"}
                      </Button>

                    </motion.div>
                  ) : (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label variant="onDark" htmlFor="signup-name">
                          Full name
                        </Label>
                        <div className="relative min-w-0">
                          <User
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-indigo-400/70"
                            size={18}
                            aria-hidden
                          />
                          <Input
                            id="signup-name"
                            type="text"
                            autoComplete="name"
                            placeholder="Jane Doe"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            variant="onDark"
                            className="pl-10 pr-11 shadow-inner shadow-black/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label variant="onDark" htmlFor="signup-email">
                          Email
                        </Label>
                        <div className="relative min-w-0">
                          <Mail
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-indigo-400/70"
                            size={18}
                            aria-hidden
                          />
                          <Input
                            id="signup-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={signUpEmail}
                            onChange={(event) => setSignUpEmail(event.target.value)}
                            variant="onDark"
                            className="pl-10 pr-11 shadow-inner shadow-black/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label variant="onDark" htmlFor="signup-password">
                          Password
                        </Label>
                        <div className="relative min-w-0">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-indigo-400/70"
                            size={18}
                            aria-hidden
                          />
                          <Input
                            id="signup-password"
                            type={showSignUpPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Min. 8 chars, upper, number, symbol"
                            value={signUpPassword}
                            onChange={(event) => setSignUpPassword(event.target.value)}
                            variant="onDark"
                            className="pl-10 pr-11 shadow-inner shadow-black/20"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                            onClick={() => setShowSignUpPassword((prev) => !prev)}
                            aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                          >
                            {showSignUpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>

                        <div className="space-y-1 pt-0.5">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                strength.color,
                                strength.width
                              )}
                            />
                          </div>
                          {strength.label ? (
                            <p
                              className={cn(
                                "text-xs",
                                strength.score === 1
                                  ? "text-red-400"
                                  : strength.score === 2
                                    ? "text-yellow-400"
                                    : "text-emerald-400"
                              )}
                            >
                              {strength.label}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label variant="onDark" htmlFor="signup-confirm">
                          Confirm password
                        </Label>
                        <div className="relative min-w-0">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-indigo-400/70"
                            size={18}
                            aria-hidden
                          />
                          <Input
                            id="signup-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Repeat password"
                            value={signUpConfirmPassword}
                            onChange={(event) => setSignUpConfirmPassword(event.target.value)}
                            variant="onDark"
                            className="pl-10 pr-11 shadow-inner shadow-black/20"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                        <Checkbox
                          id="terms"
                          checked={acceptedTerms}
                          disabled
                          className="mt-0.5 border-white/25 data-checked:border-indigo-500 data-checked:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-90"
                        />
                        <Label htmlFor="terms" variant="onDark" className="leading-relaxed text-indigo-100/80">
                          I agree to the{" "}
                          <a
                            href="/terms?source=signup"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                          >
                            terms of service
                          </a>
                        </Label>
                      </div>
                      <Button
                        type="button"
                        onClick={onSignUp}
                        disabled={signUpMutation.isPending}
                        className="h-9 w-full text-xs shadow-md"
                      >
                        {signUpMutation.isPending ? "Creating account…" : "Create account"}
                      </Button>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

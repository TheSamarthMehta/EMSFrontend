import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { patchMe } from "@/api/user";
import { ConfettiBurst } from "@/components/complete-profile/ConfettiBurst";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeftPanel } from "@/features/onboarding/components/LeftPanel";
import { StepperHeader } from "@/features/onboarding/components/StepperHeader";
import { useAIAssist } from "@/features/onboarding/hooks/useAIAssist";
import { createInitialOnboardingForm } from "@/features/onboarding/onboardingDefaults";
import { onboardingWizardSchema } from "@/features/onboarding/onboardingWizardSchema";
import { Step1Personal } from "@/features/onboarding/steps/Step1Personal";
import { Step2Preferences } from "@/features/onboarding/steps/Step2Preferences";
import { Step3Finance } from "@/features/onboarding/steps/Step3Finance";
import {
  buildChecklistRows,
  computeProgressPercent,
  getMotivationalCopy,
  isFinanceValid,
  isPersonalValid,
  isPreferencesValid,
} from "@/lib/onboardingProgress";
import type { OnboardingFormState, OnboardingStepIndex } from "@/types/onboarding";
import type { PublicUser } from "@/types/user";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { consumePostAuthRedirect } from "@/utils/postAuthRedirect";
import { toast } from "sonner";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 48 : -48, opacity: 0 }),
};

interface OnboardingFlowProps {
  user: PublicUser;
}

export default function OnboardingFlow({ user }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profileSummary } = useAIAssist();

  const [step, setStep] = useState<OnboardingStepIndex>(0);
  const [slideDir, setSlideDir] = useState(1);
  const [phase, setPhase] = useState<"wizard" | "success">("wizard");
  const [aiSummary, setAiSummary] = useState("");

  const methods = useForm<OnboardingFormState>({
    resolver: zodResolver(onboardingWizardSchema),
    mode: "onChange",
    defaultValues: createInitialOnboardingForm(user),
  });

  const { watch, reset, trigger, getValues } = methods;
  const values = watch();

  useEffect(() => {
    reset(createInitialOnboardingForm(user));
  }, [user.id, user.name, user.email, user.avatar, user.currency, user.timezone, user.language, reset, user]);

  const progress = useMemo(() => computeProgressPercent(values), [values]);
  const checklist = useMemo(
    () => buildChecklistRows(step, values, phase === "success"),
    [step, values, phase]
  );
  const headline = useMemo(
    () => getMotivationalCopy(phase === "success" ? 100 : progress),
    [phase, progress]
  );

  const firstName = useMemo(() => {
    const n = values.displayName.trim().split(/\s+/)[0];
    return n || "there";
  }, [values.displayName]);

  const financeReady = isFinanceValid(values) && values.securityAck;

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      currency: string;
      timezone: string;
      language: string;
      avatar: string;
    }) =>
      patchMe({
        name: payload.name,
        currency: payload.currency,
        timezone: payload.timezone,
        language: payload.language,
        avatar: payload.avatar,
        isProfileComplete: true,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["session"], updated);
      toast.success("Profile setup complete");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Unable to save profile"));
    },
  });

  const buildAvatarPayload = useCallback((form: OnboardingFormState): string => {
    const trimmedUrl = form.avatarUrl.trim();
    if (trimmedUrl) return trimmedUrl;
    if (form.avatarDataUrl.length > 0 && form.avatarDataUrl.length <= 80_000) return form.avatarDataUrl;
    if (form.avatarDataUrl.length > 80_000) {
      toast.message("Avatar was omitted (too large). Upload a JPEG/PNG/WebP up to 2 MB instead.");
    }
    return "";
  }, []);

  const runFinish = useCallback(
    async (opts?: { skipFinance?: boolean }): Promise<void> => {
      const form = getValues();

      if (!isPersonalValid(form)) {
        toast.error("Please fix your display name.");
        await trigger(["displayName", "phoneLocal", "phoneDial"]);
        return;
      }
      if (!isPreferencesValid(form)) {
        toast.error("Please complete preferences first.");
        return;
      }

      const fallbackSummary =
        "You are set up to track spending with your chosen categories and monthly budget. Small habits compound into big clarity.";

      let completionSummary = "";

      if (!opts?.skipFinance) {
        const okFinance = await trigger(["monthlyBudget", "categories", "securityAck"]);
        const latest = getValues();
        if (!okFinance || !isFinanceValid(latest) || !latest.securityAck) {
          if (!isFinanceValid(latest)) {
            toast.error("Enter a monthly budget and pick at least one category.");
          } else if (!latest.securityAck) {
            toast.error("Please acknowledge the security reminder.");
          }
          return;
        }

        const budgetNum = Number.parseFloat(latest.monthlyBudget.replace(/,/g, "")) || 0;
        let summaryText: string | null = null;
        try {
          summaryText = await profileSummary.mutateAsync({
            name: latest.displayName.trim(),
            currency: latest.currency,
            timezone: latest.timezone,
            categories: latest.categories,
            monthlyBudget: budgetNum,
          });
        } catch {
          summaryText = null;
        }
        completionSummary = (summaryText ?? "").trim() || fallbackSummary;
      }

      const finalForm = getValues();
      const avatarPayload = buildAvatarPayload(finalForm);

      try {
        await saveMutation.mutateAsync({
          name: finalForm.displayName.trim(),
          currency: finalForm.currency,
          timezone: finalForm.timezone,
          language: finalForm.language,
          avatar: avatarPayload,
        });
        if (!opts?.skipFinance) {
          setAiSummary(completionSummary);
          setPhase("success");
        } else {
          navigate(consumePostAuthRedirect() || "/dashboard", { replace: true });
        }
      } catch {
        /* toast in mutation */
      }
    },
    [buildAvatarPayload, getValues, navigate, profileSummary, saveMutation, trigger]
  );

  const goNext = async (): Promise<void> => {
    if (step === 0) {
      const ok = await trigger(["displayName", "phoneLocal", "phoneDial"]);
      if (!ok || !isPersonalValid(getValues())) return;
      setSlideDir(1);
      setStep(1);
      return;
    }
    if (step === 1) {
      const ok = await trigger(["currency", "timezone", "language"]);
      if (!ok || !isPreferencesValid(getValues())) {
        toast.error("Please pick currency, timezone, and language.");
        return;
      }
      setSlideDir(1);
      setStep(2);
    }
  };

  const goBack = (): void => {
    if (step === 0) return;
    setSlideDir(-1);
    setStep((s) => (s > 0 ? ((s - 1) as OnboardingStepIndex) : 0));
  };

  const handleDashboard = (): void => {
    navigate(consumePostAuthRedirect() || "/dashboard", { replace: true });
  };

  return (
    <FormProvider {...methods}>
      <div className="text-slate-100 -mx-4 -my-4 min-h-[calc(100dvh-7rem)] bg-[hsl(222_47%_7%)] md:-mx-6 md:-my-6">
        <ConfettiBurst active={phase === "success"} />
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_30%_0%,rgba(99,102,241,0.14),transparent_60%)]"
            aria-hidden
          />
          <div className="relative z-10 mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 md:py-8 xl:max-w-[1200px]">
            <div className="grid min-h-[calc(100dvh-7rem)] gap-6 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)] lg:gap-8">
              <LeftPanel progressPercent={phase === "success" ? 100 : progress} headline={headline} checklist={checklist} />

              <section className="flex min-h-0 flex-col">
                <div className="relative rounded-2xl border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/95 p-5 shadow-xl backdrop-blur-md sm:p-6">
                  {phase === "success" ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex min-h-[420px] flex-col items-center justify-center px-2 py-10 text-center sm:min-h-[480px]"
                    >
                      <div
                        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[hsl(158_64%_40%)]/50 bg-[hsl(158_64%_40%)]/15"
                        aria-hidden
                      >
                        <motion.svg
                          width="40"
                          height="40"
                          viewBox="0 0 40 40"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        >
                          <motion.path
                            d="M8 20 L17 29 L32 12"
                            fill="none"
                            stroke="hsl(158 64% 52%)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
                          />
                        </motion.svg>
                      </div>
                      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        Your profile is ready, {firstName}! 🎉
                      </h2>
                      <Card className="mt-6 w-full max-w-md border-[hsl(280_80%_65%)]/20 bg-[hsl(280_80%_65%)]/10 text-left shadow-none">
                        <CardContent className="p-4 pt-4">
                          <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-200">
                            <span className="mt-0.5 shrink-0 text-purple-300" aria-hidden>
                              ✨
                            </span>
                            {aiSummary}
                          </p>
                        </CardContent>
                      </Card>
                      <Button
                        type="button"
                        className="mt-8 h-10 min-w-[200px] rounded-md bg-[hsl(252_87%_67%)] text-sm font-semibold text-white hover:bg-[hsl(252_87%_67%)]/90"
                        onClick={handleDashboard}
                      >
                        Go to Dashboard
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <StepperHeader step={step} />
                      <div className="relative min-h-[320px] overflow-hidden sm:min-h-[360px]">
                        <AnimatePresence mode="wait" custom={slideDir}>
                          {step === 0 ? (
                            <motion.div
                              key="s0"
                              custom={slideDir}
                              variants={slideVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <Step1Personal
                                userEmail={user.email}
                                onAvatarSessionUser={(u) => queryClient.setQueryData(["session"], u)}
                              />
                            </motion.div>
                          ) : null}
                          {step === 1 ? (
                            <motion.div
                              key="s1"
                              custom={slideDir}
                              variants={slideVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <Step2Preferences />
                            </motion.div>
                          ) : null}
                          {step === 2 ? (
                            <motion.div
                              key="s2"
                              custom={slideDir}
                              variants={slideVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <Step3Finance />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[hsl(222_30%_18%)] pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {step > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={goBack}
                              className="text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                            >
                              Back
                            </Button>
                          ) : (
                            <span />
                          )}
                          {step === 2 ? (
                            <button
                              type="button"
                              disabled={saveMutation.isPending}
                              onClick={() => void runFinish({ skipFinance: true })}
                              className="text-[15px] font-medium text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline disabled:opacity-50"
                            >
                              Skip optional setup
                            </button>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          disabled={
                            saveMutation.isPending ||
                            profileSummary.isPending ||
                            (step === 2 && !financeReady)
                          }
                          onClick={() => {
                            if (step < 2) {
                              void goNext();
                              return;
                            }
                            void runFinish();
                          }}
                          className="h-9 min-w-[140px] rounded-md bg-[hsl(252_87%_67%)] text-xs font-semibold text-white shadow-lg hover:bg-[hsl(252_87%_67%)]/90 disabled:opacity-50"
                        >
                          {saveMutation.isPending || profileSummary.isPending
                            ? "Saving…"
                            : step === 2
                              ? "Save & finish"
                              : "Save & continue"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

import { z } from "zod";

export const onboardingWizardSchema = z
  .object({
  displayName: z.string().trim().min(2, "Use at least 2 characters").max(80),
  phoneDial: z.string().trim().min(1).max(8),
  phoneLocal: z.string().max(24),
  dob: z.date().optional(),
  avatarUrl: z.string().max(2048),
  avatarDataUrl: z.string().max(120_000),
  currency: z.string().trim().min(2).max(8),
  timezone: z.string().trim().min(1).max(64),
  language: z.string().trim().min(1).max(16),
  monthlyBudget: z.string().max(32),
  categories: z.array(z.string().min(1).max(40)).max(20),
  linkedTypes: z.array(z.enum(["bank", "upi", "card"])).max(6),
  securityAck: z.boolean(),
})
  .superRefine((data, ctx) => {
    const digits = data.phoneLocal.replace(/\D/g, "");
    if (data.phoneLocal.trim().length > 0 && digits.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["phoneLocal"],
        message: "Enter a valid phone number or leave blank.",
      });
    }
  });

export type OnboardingWizardFormValues = z.infer<typeof onboardingWizardSchema>;

import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(500).optional(),
  avatarUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  currency: z.string().trim().min(2).max(8),
});

export const inviteMemberSchema = z
  .object({
    inviteeEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    inviteeUsername: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  })
  .refine((value) => Boolean(value.inviteeEmail || value.inviteeUsername), {
    message: "Email or username is required",
    path: ["inviteeEmail"],
  });

export const addExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().trim().min(1).max(50),
  notes: z.string().trim().max(1000).optional(),
  billImageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  date: z.string().trim().min(1, "Date is required"),
  paidBy: z.string().min(1, "Select payer"),
  splitType: z.enum(["equal", "exact", "percentage"]),
});

export const settleUpSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["cash", "upi", "bank", "other"]),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(300).optional(),
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
export type AddExpenseFormValues = z.infer<typeof addExpenseSchema>;
export type SettleUpFormValues = z.infer<typeof settleUpSchema>;

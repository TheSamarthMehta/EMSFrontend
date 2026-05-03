import { api } from "@/api/client";
import type { VerifyEmailOtpResponse } from "@/types/emailOtp.types";
import type { AuthResponse, PublicUser, RegisterResponse } from "@/types/user";

export async function postRegister(body: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>("/auth/register", body);
  return data;
}

export async function postLogin(body: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", body);
  return data;
}

export async function postLogout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<PublicUser> {
  const { data } = await api.get<PublicUser>("/auth/me");
  return data;
}

export interface SendEmailOtpResponse {
  message: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  email: string;
  emailMasked: string;
  /** `resend` = sent via Resend API; `smtp` = nodemailer; `log-only` = not delivered. */
  deliveryMode: "smtp" | "resend" | "log-only";
  previewCode?: string;
  /** True when the server has Resend or SMTP configured for transactional mail. */
  smtpConfigured: boolean;
  otpStorage?: "memory" | "mongo";
}

export async function sendSignInEmailOtp(body: {
  email: string;
  name?: string;
}): Promise<SendEmailOtpResponse> {
  const { data } = await api.post<SendEmailOtpResponse>("/auth/email-otp/send", body);
  return data;
}

export async function verifySignInEmailOtp(body: {
  email: string;
  code: string;
}): Promise<VerifyEmailOtpResponse> {
  const { data } = await api.post<VerifyEmailOtpResponse>("/auth/email-otp/verify", body);
  return data;
}

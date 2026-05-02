import { api } from "@/api/client";
import type { VerifyEmailOtpResponse } from "@/types/emailOtp.types";
import type { AuthResponse, PublicUser } from "@/types/user";

export async function postRegister(body: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", body);
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
  email: string;
  emailMasked: string;
  deliveryMode: "smtp" | "log-only";
  previewCode?: string;
  smtpConfigured: boolean;
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

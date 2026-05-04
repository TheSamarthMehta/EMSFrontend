export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  currency: string;
  timezone: string;
  language: string;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type PatchMeBody = {
  name?: string;
  currency?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
  isProfileComplete?: true;
};

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

/** Register when email OTP is required before JWT/refresh cookies are issued. */
export interface RegisterPendingVerificationResponse {
  requiresEmailVerification: true;
  email: string;
  name?: string;
  emailMasked: string;
  message: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export type RegisterResponse = AuthResponse | RegisterPendingVerificationResponse;

export function isRegisterPendingVerification(
  data: RegisterResponse
): data is RegisterPendingVerificationResponse {
  return "requiresEmailVerification" in data && data.requiresEmailVerification === true;
}

export function isAuthResponse(data: RegisterResponse): data is AuthResponse {
  return "accessToken" in data && Boolean(data.accessToken);
}

import type { PublicUser } from "@/types/user";

export interface VerifyEmailOtpResponse {
  ok: boolean;
  message: string;
  email: string;
  accessToken?: string;
  user?: PublicUser;
  needsFirebaseSession?: boolean;
}

export interface FirebaseSessionResponse {
  accessToken: string;
  user: PublicUser;
}

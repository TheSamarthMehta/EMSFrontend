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

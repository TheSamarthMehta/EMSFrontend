export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phone: string | null;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  provider: "google" | "apple" | "email";
  currency: string;
  company: string | null;
  createdAt: Date;
  lastLogin: Date;
}

export interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

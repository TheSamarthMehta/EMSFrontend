import { create } from "zustand";
import { persist } from "zustand/middleware";

import { patchMe } from "@/api/user";
import {
  patchAppearanceSettings,
  patchDataSettings,
  patchNotificationSettings,
  patchSecuritySettings,
  type AppearanceSettings,
  type DataSettings,
  type NotificationSettings,
  type SecuritySettings,
} from "@/api/settings";
import { LANGUAGES } from "@/features/settings/settingsConstants";
import type { FeedbackPageValue } from "@/components/FeedbackWidget/constants";
import type { EnhancedFeedback, FeedbackSeverity, FeedbackType } from "@/types/feedback";
import type { PublicUser } from "@/types/user";

export interface ProfileState {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  currency: string;
  timezone: string;
  language: string;
  isDirty: boolean;
  isSaving: boolean;
}

export interface NotificationsState {
  budgetAlerts: boolean;
  weeklyDigest: boolean;
  monthlyReport: boolean;
  largeExpenseAlert: boolean;
  largeExpenseThreshold: number;
  browserPush: boolean;
  pushPermission: NotificationPermission;
}

export interface AppearanceState {
  theme: "light" | "dark" | "system";
  accent: string;
  compactMode: boolean;
  showCents: boolean;
  defaultLandingPage: string;
}

export interface SecurityState {
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  loginNotifications: boolean;
}

export interface FeedbackState {
  type: FeedbackType | null;
  page: FeedbackPageValue;
  subject: string;
  description: string;
  severity: FeedbackSeverity;
  attachment: File | null;
  userEmail: string;
  aiEnhance: boolean;
  status: "idle" | "ai-loading" | "sending" | "success" | "error";
  enhanced: EnhancedFeedback | null;
}

interface SettingsStoreState {
  profile: ProfileState;
  notifications: NotificationsState;
  appearance: AppearanceState;
  security: SecurityState;
  data: DataSettings;
  feedback: FeedbackState;
  updateProfile: (patch: Partial<ProfileState>) => void;
  hydrateFromUser: (user: PublicUser) => void;
  saveProfile: () => Promise<PublicUser>;
  updateNotifications: (patch: Partial<NotificationsState>) => void;
  hydrateNotifications: (input: NotificationSettings) => void;
  saveNotifications: () => Promise<NotificationSettings>;
  updateAppearance: (patch: Partial<AppearanceState>) => void;
  hydrateAppearance: (input: AppearanceSettings) => void;
  saveAppearanceRemote: () => Promise<AppearanceSettings>;
  updateSecurity: (patch: Partial<SecurityState>) => void;
  hydrateSecurity: (input: SecuritySettings) => void;
  saveSecurity: () => Promise<SecuritySettings>;
  updateData: (patch: Partial<DataSettings>) => void;
  hydrateData: (input: DataSettings) => void;
  saveData: () => Promise<DataSettings>;
  updateFeedback: (patch: Partial<FeedbackState>) => void;
  resetFeedback: () => void;
}

const DEFAULT_PROFILE: ProfileState = {
  displayName: "",
  email: "",
  avatarUrl: null,
  currency: "INR",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  language: LANGUAGES[0]?.code || "en",
  isDirty: false,
  isSaving: false,
};

const DEFAULT_NOTIFICATIONS: NotificationsState = {
  budgetAlerts: true,
  weeklyDigest: false,
  monthlyReport: true,
  largeExpenseAlert: true,
  largeExpenseThreshold: 5000,
  browserPush: false,
  pushPermission: typeof Notification === "undefined" ? "default" : Notification.permission,
};

const DEFAULT_APPEARANCE: AppearanceState = {
  theme: "system",
  accent: "#6366f1",
  compactMode: false,
  showCents: true,
  defaultLandingPage: "/dashboard",
};

const DEFAULT_SECURITY: SecurityState = {
  twoFactorEnabled: false,
  sessionTimeoutMinutes: 60,
  loginNotifications: true,
};

const DEFAULT_DATA: DataSettings = {
  autoBackup: false,
  backupFrequency: "weekly",
  lastBackupAt: null,
};

const DEFAULT_FEEDBACK: FeedbackState = {
  type: null,
  page: "settings",
  subject: "",
  description: "",
  severity: "medium",
  attachment: null,
  userEmail: "",
  aiEnhance: true,
  status: "idle",
  enhanced: null,
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      notifications: DEFAULT_NOTIFICATIONS,
      appearance: DEFAULT_APPEARANCE,
      security: DEFAULT_SECURITY,
      data: DEFAULT_DATA,
      feedback: DEFAULT_FEEDBACK,

      updateProfile: (patch) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...patch,
            isDirty: true,
          },
        })),

      hydrateFromUser: (user) =>
        set((state) => ({
          profile: {
            ...state.profile,
            displayName: user.name,
            email: user.email,
            avatarUrl: user.avatar || null,
            currency: user.currency || state.profile.currency,
            timezone: user.timezone || state.profile.timezone,
            language: user.language || state.profile.language,
            isDirty: false,
            isSaving: false,
          },
          feedback: {
            ...state.feedback,
            userEmail: user.email || state.feedback.userEmail,
          },
        })),

      saveProfile: async () => {
        const current = get().profile;
        set((state) => ({ profile: { ...state.profile, isSaving: true } }));
        try {
          const updated = await patchMe({
            name: current.displayName.trim(),
            currency: current.currency,
            timezone: current.timezone,
            language: current.language,
            avatar: current.avatarUrl || undefined,
          });
          set((state) => ({
            profile: {
              ...state.profile,
              displayName: updated.name,
              email: updated.email,
              avatarUrl: updated.avatar || null,
              currency: updated.currency,
              timezone: updated.timezone,
              language: updated.language,
              isDirty: false,
              isSaving: false,
            },
          }));
          return updated;
        } catch (error) {
          set((state) => ({ profile: { ...state.profile, isSaving: false } }));
          throw error;
        }
      },

      updateNotifications: (patch) =>
        set((state) => ({
          notifications: { ...state.notifications, ...patch },
        })),

      hydrateNotifications: (input) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            budgetAlerts: input.budgetAlerts,
            weeklyDigest: input.weeklyDigest,
            monthlyReport: input.monthlyReport,
            largeExpenseAlert: input.largeExpenseAlert,
            largeExpenseThreshold: input.largeExpenseThreshold,
            browserPush: input.pushEnabled,
          },
        })),

      saveNotifications: async () => {
        const n = get().notifications;
        const saved = await patchNotificationSettings({
          budgetAlerts: n.budgetAlerts,
          weeklyDigest: n.weeklyDigest,
          monthlyReport: n.monthlyReport,
          largeExpenseAlert: n.largeExpenseAlert,
          largeExpenseThreshold: n.largeExpenseThreshold,
          pushEnabled: n.browserPush,
        });
        get().hydrateNotifications(saved);
        return saved;
      },

      updateAppearance: (patch) =>
        set((state) => ({
          appearance: { ...state.appearance, ...patch },
        })),

      hydrateAppearance: (input) =>
        set(() => ({
          appearance: {
            theme: input.theme,
            accent: input.accentColor,
            compactMode: input.compactMode,
            showCents: input.showCentsInAmounts,
            defaultLandingPage: input.defaultLandingPage,
          },
        })),

      saveAppearanceRemote: async () => {
        const a = get().appearance;
        const saved = await patchAppearanceSettings({
          theme: a.theme,
          accentColor: a.accent as AppearanceSettings["accentColor"],
          compactMode: a.compactMode,
          showCentsInAmounts: a.showCents,
          defaultLandingPage: a.defaultLandingPage as AppearanceSettings["defaultLandingPage"],
        });
        get().hydrateAppearance(saved);
        return saved;
      },

      updateSecurity: (patch) =>
        set((state) => ({
          security: { ...state.security, ...patch },
        })),

      hydrateSecurity: (input) =>
        set(() => ({
          security: {
            twoFactorEnabled: input.twoFactorEnabled,
            sessionTimeoutMinutes: input.sessionTimeoutMinutes,
            loginNotifications: input.loginNotifications,
          },
        })),

      saveSecurity: async () => {
        const s = get().security;
        const saved = await patchSecuritySettings({
          sessionTimeoutMinutes: s.sessionTimeoutMinutes,
          loginNotifications: s.loginNotifications,
        });
        get().hydrateSecurity(saved);
        return saved;
      },

      updateData: (patch) =>
        set((state) => ({
          data: { ...state.data, ...patch },
        })),

      hydrateData: (input) =>
        set(() => ({
          data: input,
        })),

      saveData: async () => {
        const d = get().data;
        const saved = await patchDataSettings({
          autoBackup: d.autoBackup,
          backupFrequency: d.backupFrequency,
        });
        get().hydrateData(saved);
        return saved;
      },

      updateFeedback: (patch) =>
        set((state) => ({
          feedback: { ...state.feedback, ...patch },
        })),

      resetFeedback: () =>
        set((state) => ({
          feedback: {
            ...DEFAULT_FEEDBACK,
            userEmail: state.feedback.userEmail,
          },
        })),
    }),
    {
      name: "settings-store-v1",
      partialize: (state) => ({
        appearance: state.appearance,
        notifications: state.notifications,
        data: state.data,
      }),
    }
  )
);

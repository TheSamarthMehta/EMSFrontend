import { api } from "@/api/client";
import type { AccentKey } from "@/features/settings/settingsConstants";

export type NotificationSettings = {
  budgetAlerts: boolean;
  weeklyDigest: boolean;
  monthlyReport: boolean;
  largeExpenseAlert: boolean;
  largeExpenseThreshold: number;
  pushEnabled: boolean;
  pushEndpoint: string | null;
};

export type AppearanceSettings = {
  theme: "light" | "dark" | "system";
  accentColor: AccentKey;
  compactMode: boolean;
  showCentsInAmounts: boolean;
  defaultLandingPage: "/dashboard" | "/expenses" | "/budget" | "/reports";
};

export type SecuritySettings = {
  sessionTimeoutMinutes: number;
  loginNotifications: boolean;
  twoFactorEnabled: boolean;
};

export type DataSettings = {
  autoBackup: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
  lastBackupAt: string | null;
};

export type SessionRow = {
  id: string;
  deviceName: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await api.get<NotificationSettings>("/auth/me/notifications");
  return data;
}

export async function patchNotificationSettings(
  body: Partial<Omit<NotificationSettings, "pushEndpoint">>
): Promise<NotificationSettings> {
  const { data } = await api.patch<NotificationSettings>("/auth/me/notifications", body);
  return data;
}

export async function postPushSubscription(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<void> {
  await api.post("/auth/me/push-subscription", payload);
}

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  const { data } = await api.get<AppearanceSettings>("/auth/me/appearance");
  return data;
}

export async function patchAppearanceSettings(
  body: Partial<AppearanceSettings>
): Promise<AppearanceSettings> {
  const { data } = await api.patch<AppearanceSettings>("/auth/me/appearance", body);
  return data;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const { data } = await api.get<SecuritySettings>("/auth/me/security");
  return data;
}

export async function patchSecuritySettings(
  body: Partial<Pick<SecuritySettings, "sessionTimeoutMinutes" | "loginNotifications">>
): Promise<SecuritySettings> {
  const { data } = await api.patch<SecuritySettings>("/auth/me/security", body);
  return data;
}

export async function getDataSettings(): Promise<DataSettings> {
  const { data } = await api.get<DataSettings>("/auth/me/data-settings");
  return data;
}

export async function patchDataSettings(
  body: Partial<Pick<DataSettings, "autoBackup" | "backupFrequency">>
): Promise<DataSettings> {
  const { data } = await api.patch<DataSettings>("/auth/me/data-settings", body);
  return data;
}

export async function getStorageUsage(): Promise<{
  transactions: { count: number; estimatedBytes: number };
  attachments: { count: number; totalBytes: number };
  totalBytes: number;
}> {
  const { data } = await api.get("/auth/me/storage");
  return data;
}

export async function uploadAvatarFile(
  file: File
): Promise<{ url: string; user?: import("@/types/user").PublicUser }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ url: string; user?: import("@/types/user").PublicUser }>(
    "/upload/avatar",
    form
  );
  return data;
}

export async function post2faSetup(): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
  const { data } = await api.post("/auth/2fa/setup");
  return data;
}

export async function post2faVerify(code: string): Promise<{ success: boolean; backupCodes: string[] }> {
  const { data } = await api.post("/auth/2fa/verify", { code });
  return data;
}

export async function post2faDisable(code: string): Promise<{ success: boolean }> {
  const { data } = await api.post("/auth/2fa/disable", { code });
  return data;
}

export async function getSessions(): Promise<{ sessions: SessionRow[] }> {
  const { data } = await api.get<{ sessions: SessionRow[] }>("/auth/sessions");
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/auth/sessions/${encodeURIComponent(id)}`);
}

export async function deleteOtherSessions(): Promise<{ revokedCount: number }> {
  const { data } = await api.delete<{ revokedCount: number }>("/auth/sessions");
  return data;
}

export async function postChangePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/auth/change-password", body);
}

export type BackupListItem = {
  id: string;
  createdAt: string;
  sizeBytes: number;
  downloadUrl: string;
  transactionCount: number;
};

export async function getBackups(): Promise<{ backups: BackupListItem[] }> {
  const { data } = await api.get<{ backups: BackupListItem[] }>("/auth/me/backups");
  return data;
}

export async function postBackupNow(): Promise<{ downloadUrl: string; id: string }> {
  const { data } = await api.post("/auth/me/backups");
  return data;
}

export async function postImportCsvPreview(file: File): Promise<{
  stagingId: string;
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  preview: { date: string; type: string; category: string; amount: number; note: string }[];
}> {
  const form = new FormData();
  form.append("csv", file);
  const { data } = await api.post("/transactions/import/csv", form);
  return data;
}

export async function postImportCsvConfirm(body: {
  stagingId: string;
  mapping: Partial<Record<"date" | "type" | "category" | "amount" | "note", string>>;
}): Promise<{ imported: number; skipped: number; errors: { row: number; reason: string }[] }> {
  const { data } = await api.post("/transactions/import/csv/confirm", body);
  return data;
}

export async function deleteTransactionsThisMonth(): Promise<{ deletedCount: number }> {
  const { data } = await api.delete<{ deletedCount: number }>("/auth/me/transactions/month", {
    data: { confirmation: "CLEAR MONTH" },
  });
  return data;
}

export async function deleteAllTransactions(): Promise<{ deletedCount: number }> {
  const { data } = await api.delete<{ deletedCount: number }>("/auth/me/transactions", {
    data: { confirmation: "DELETE" },
  });
  return data;
}

export async function deleteAccount(confirmation: string): Promise<void> {
  await api.delete("/auth/me", { data: { confirmation } });
}

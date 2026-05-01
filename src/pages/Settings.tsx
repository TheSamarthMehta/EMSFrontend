import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { SettingsTabs, type SettingsTabKey } from "@/components/settings/SettingsTabs";
import { AppearanceTab } from "@/components/settings/tabs/AppearanceTab";
import { DangerZoneTab } from "@/components/settings/tabs/DangerZoneTab";
import { DataExportTab } from "@/components/settings/tabs/DataExportTab";
import { FeedbackTab } from "@/components/settings/tabs/FeedbackTab";
import { NotificationsTab } from "@/components/settings/tabs/NotificationsTab";
import { ProfileTab } from "@/components/settings/tabs/ProfileTab";
import { SecurityTab } from "@/components/settings/tabs/SecurityTab";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSession } from "@/hooks/useSession";
import { useSettingsStore } from "@/hooks/useSettingsStore";

const validTabs: SettingsTabKey[] = [
  "profile",
  "notifications",
  "appearance",
  "security",
  "data",
  "feedback",
  "danger",
];

function isValidTab(input: string | null): input is SettingsTabKey {
  if (!input) return false;
  return validTabs.includes(input as SettingsTabKey);
}

export default function Settings() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user } = useSession(true);
  const { hydrateFromUser, updateFeedback } = useSettingsStore();

  const activeTab = useMemo<SettingsTabKey>(() => {
    const candidate = searchParams.get("tab");
    return isValidTab(candidate) ? candidate : "profile";
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    hydrateFromUser(user);
    updateFeedback({ userEmail: user.email });
  }, [hydrateFromUser, updateFeedback, user]);

  useEffect(() => {
    if (searchParams.get("tab")) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", "profile");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (!user) {
    return (
      <div className="min-h-[40vh] px-2 py-3">
        <p className="text-muted-foreground text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage profile, security, notifications, data, and feedback.</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = isValidTab(value) ? value : "profile";
          const next = new URLSearchParams(searchParams);
          next.set("tab", nextTab);
          setSearchParams(next);
        }}
        className="w-full"
      >
        <SettingsTabs activeTab={activeTab} />

        <TabsContent value="profile">
          <ProfileTab
            user={user}
            onUserUpdated={(updated) => {
              qc.setQueryData(["session"], updated);
              hydrateFromUser(updated);
            }}
          />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="data">
          <DataExportTab />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackTab />
        </TabsContent>
        <TabsContent value="danger">
          <DangerZoneTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

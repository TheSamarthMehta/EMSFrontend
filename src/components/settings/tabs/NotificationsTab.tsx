import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { ToggleRow } from "@/components/settings/shared/ToggleRow";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import { postPushSubscription } from "@/api/settings";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

function clampThreshold(value: number): number {
  if (Number.isNaN(value)) return 100;
  return Math.max(100, Math.min(100000, value));
}

function permissionBadgeColor(permission: NotificationPermission): string {
  if (permission === "granted") return "border-emerald-500/40 text-emerald-300";
  if (permission === "denied") return "border-destructive/40 text-destructive";
  return "border-amber-500/40 text-amber-300";
}

export function NotificationsTab() {
  const { notifications, updateNotifications, saveNotifications } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);

  const handleEnablePush = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }
    if (!("serviceWorker" in navigator)) {
      toast.error("Service Worker is required for push notifications.");
      return;
    }

    setRequestingPush(true);
    try {
      const permission = await Notification.requestPermission();
      updateNotifications({ pushPermission: permission });
      if (permission !== "granted") {
        toast.error("Push permission was not granted.");
        return;
      }

      const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapid) {
        toast.error("Missing VAPID public key.");
        return;
      }

      const toUint8Array = (base64String: string): Uint8Array => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; i += 1) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapid) as BufferSource,
      });

      const json = subscription.toJSON();
      const endpoint = json.endpoint ?? subscription.endpoint;
      const keys = json.keys;
      if (!endpoint || !keys?.auth || !keys.p256dh) {
        toast.error("Could not read push subscription keys.");
        return;
      }

      await postPushSubscription({
        endpoint,
        keys: {
          auth: keys.auth,
          p256dh: keys.p256dh,
        },
      });
      updateNotifications({ browserPush: true, pushPermission: permission });
      toast.success("Browser push enabled.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to enable push."));
    } finally {
      setRequestingPush(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNotifications();
      toast.success("Notification settings saved");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title="Notifications" description="Control what we notify you about and when.">
      <div className="space-y-3">
        <ToggleRow
          id="budgetAlerts"
          label="Budget alerts"
          description="Get notified when a category reaches its budget."
          checked={notifications.budgetAlerts}
          onCheckedChange={(value) => updateNotifications({ budgetAlerts: value })}
        />
        <ToggleRow
          id="weeklyDigest"
          label="Weekly digest"
          description="Receive your weekly spending summary."
          checked={notifications.weeklyDigest}
          onCheckedChange={(value) => updateNotifications({ weeklyDigest: value })}
        />
        <ToggleRow
          id="monthlyReport"
          label="Monthly report"
          description="Receive monthly financial reports."
          checked={notifications.monthlyReport}
          onCheckedChange={(value) => updateNotifications({ monthlyReport: value })}
        />

        <ToggleRow
          id="largeExpenseAlert"
          label="Large expense alert"
          description="Notify me on unusually large expenses."
          checked={notifications.largeExpenseAlert}
          onCheckedChange={(value) => updateNotifications({ largeExpenseAlert: value })}
        />

        {notifications.largeExpenseAlert ? (
          <div className="rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/60 px-3 py-3">
            <Label htmlFor="threshold" className="mb-1.5 block text-sm font-medium">
              Threshold
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateNotifications({
                    largeExpenseThreshold: clampThreshold(notifications.largeExpenseThreshold - 100),
                  })
                }
              >
                -
              </Button>
              <Input
                id="threshold"
                type="number"
                min={100}
                max={100000}
                className="w-40"
                value={notifications.largeExpenseThreshold}
                onChange={(e) =>
                  updateNotifications({
                    largeExpenseThreshold: clampThreshold(Number(e.target.value)),
                  })
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateNotifications({
                    largeExpenseThreshold: clampThreshold(notifications.largeExpenseThreshold + 100),
                  })
                }
              >
                +
              </Button>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/60 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Browser push</Label>
              <p className="text-muted-foreground text-xs">Enable push on this device.</p>
            </div>
            <Badge variant="outline" className={permissionBadgeColor(notifications.pushPermission)}>
              {notifications.pushPermission}
            </Badge>
          </div>
          <Button type="button" variant="outline" onClick={() => void handleEnablePush()} disabled={requestingPush}>
            {requestingPush ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enable push on this device
          </Button>
        </div>
      </div>

      <Button type="button" onClick={() => void handleSave()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save notification settings
      </Button>
    </SettingsCard>
  );
}

import {
  AlertTriangle,
  Bell,
  Database,
  MessageSquarePlus,
  Paintbrush,
  ShieldCheck,
  User,
} from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type SettingsTabKey =
  | "profile"
  | "notifications"
  | "appearance"
  | "security"
  | "data"
  | "feedback"
  | "danger";

const SETTINGS_TABS: Array<{
  key: SettingsTabKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}> = [
  { key: "profile", label: "Profile", Icon: User },
  { key: "notifications", label: "Notifications", Icon: Bell },
  { key: "appearance", label: "Appearance", Icon: Paintbrush },
  { key: "security", label: "Security", Icon: ShieldCheck },
  { key: "data", label: "Data & export", Icon: Database },
  { key: "feedback", label: "Feedback", Icon: MessageSquarePlus },
  { key: "danger", label: "Danger zone", Icon: AlertTriangle, destructive: true },
];

interface SettingsTabsProps {
  activeTab: SettingsTabKey;
}

export function SettingsTabs({ activeTab }: SettingsTabsProps) {
  return (
    <TabsList
      variant="line"
      className="mb-4 h-auto w-full min-w-0 flex-wrap justify-start gap-0 rounded-none border-b border-[hsl(222_30%_18%)] p-0"
    >
      {SETTINGS_TABS.map(({ key, label, Icon, destructive }) => (
        <TabsTrigger
          key={key}
          value={key}
          className={cn(
            "rounded-none border-b-2 border-transparent px-3 py-2 text-sm",
            "text-muted-foreground data-active:text-primary data-active:border-primary",
            destructive &&
              "text-destructive data-active:border-destructive data-active:text-destructive",
            key === activeTab && destructive ? "text-destructive" : ""
          )}
        >
          <Icon className="size-4" />
          <span>{label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

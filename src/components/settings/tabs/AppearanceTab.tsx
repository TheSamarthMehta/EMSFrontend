import { useEffect, useMemo, useState } from "react";
import { Laptop, Loader2, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { ToggleRow } from "@/components/settings/shared/ToggleRow";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const accentOptions = [
  { name: "indigo", value: "#6366f1" },
  { name: "purple", value: "#8b5cf6" },
  { name: "emerald", value: "#10b981" },
  { name: "rose", value: "#f43f5e" },
  { name: "amber", value: "#f59e0b" },
  { name: "blue", value: "#3b82f6" },
] as const;

const localStorageKey = "app_appearance";

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    return;
  }
  if (theme === "light") {
    root.classList.remove("dark");
    return;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", prefersDark);
}

function setAccentColor(hex: string) {
  document.documentElement.style.setProperty("--primary", hex);
}

export function AppearanceTab() {
  const { appearance, updateAppearance } = useSettingsStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    applyTheme(appearance.theme);
  }, [appearance.theme]);

  useEffect(() => {
    setAccentColor(appearance.accent);
  }, [appearance.accent]);

  const selectedAccent = useMemo(
    () => accentOptions.find((option) => option.value === appearance.accent) ?? accentOptions[0],
    [appearance.accent]
  );

  const saveAppearance = async () => {
    setSaving(true);
    try {
      localStorage.setItem(
        localStorageKey,
        JSON.stringify({
          theme: appearance.theme,
          accent: appearance.accent,
          compactMode: appearance.compactMode,
          showCents: appearance.showCents,
          defaultLandingPage: appearance.defaultLandingPage,
        })
      );
      toast.success("Appearance saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title="Appearance" description="Customize theme, colors, and formatting preferences.">
      <div className="space-y-3">
        <Label className="mb-1.5 block text-sm font-medium">Theme</Label>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { key: "light", label: "Light", Icon: Sun },
              { key: "dark", label: "Dark", Icon: Moon },
              { key: "system", label: "System", Icon: Laptop },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateAppearance({ theme: key })}
              className={cn(
                "rounded-xl border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)] p-3 text-left",
                appearance.theme === key && "ring-2 ring-primary"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="h-8 rounded-md border border-[hsl(222_30%_18%)] bg-[hsl(222_47%_7%)]" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-sm font-medium">Accent color</Label>
        <div className="flex flex-wrap items-center gap-3">
          {accentOptions.map((color) => (
            <button
              key={color.name}
              type="button"
              title={color.name}
              className={cn(
                "size-8 rounded-full border transition-transform",
                color.value === appearance.accent ? "scale-110 ring-2 ring-white" : "ring-0"
              )}
              style={{ backgroundColor: color.value }}
              onClick={() => updateAppearance({ accent: color.value })}
            />
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">Selected: {selectedAccent.name}</p>
      </div>

      <ToggleRow
        id="compactMode"
        label="Compact mode"
        description="Reduce spacing in cards and data rows."
        checked={appearance.compactMode}
        onCheckedChange={(value) => updateAppearance({ compactMode: value })}
      />
      <ToggleRow
        id="showCents"
        label="Show cents"
        description="Display decimal precision in currency values."
        checked={appearance.showCents}
        onCheckedChange={(value) => updateAppearance({ showCents: value })}
      />

      <div>
        <Label className="mb-1.5 block text-sm font-medium">Default landing page</Label>
        <Select
          value={appearance.defaultLandingPage}
          onValueChange={(value) => {
            if (!value) return;
            updateAppearance({ defaultLandingPage: value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="/dashboard">/dashboard</SelectItem>
            <SelectItem value="/expenses">/expenses</SelectItem>
            <SelectItem value="/reports">/reports</SelectItem>
            <SelectItem value="/settings">/settings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="button" onClick={() => void saveAppearance()} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save appearance
      </Button>
    </SettingsCard>
  );
}

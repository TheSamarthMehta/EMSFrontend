import { useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { uploadAvatarFile } from "@/api/settings";
import { patchMe } from "@/api/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { TIMEZONE_OPTIONS } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import type { PublicUser } from "@/types/user";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

const currencies = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound Sterling" },
  { code: "INR", label: "Indian Rupee" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "AED", label: "UAE Dirham" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "ZAR", label: "South African Rand" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "KRW", label: "South Korean Won" },
] as const;

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
] as const;

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(50),
  currency: z.string().min(3),
  timezone: z.string().min(1),
  language: z.string().min(1),
});

type ProfileForm = z.infer<typeof profileSchema>;

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getTimezoneGroups(): Array<{ region: string; items: string[] }> {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (input: string) => string[] })
    .supportedValuesOf;
  if (!supportedValuesOf) {
    return [{ region: "Common", items: TIMEZONE_OPTIONS.map((z) => z.value) }];
  }
  const raw = supportedValuesOf("timeZone");
  const grouped = new Map<string, string[]>();
  for (const zone of raw) {
    const [region] = zone.split("/");
    const key = region || "Other";
    const current = grouped.get(key) ?? [];
    current.push(zone);
    grouped.set(key, current);
  }
  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([region, items]) => ({ region, items }));
}

interface ProfileTabProps {
  user: PublicUser;
  onUserUpdated: (user: PublicUser) => void;
}

export function ProfileTab({ user, onUserUpdated }: ProfileTabProps) {
  const { profile, updateProfile, saveProfile } = useSettingsStore();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const timezoneGroups = useMemo(() => getTimezoneGroups(), []);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: profile.displayName,
      currency: profile.currency,
      timezone: profile.timezone,
      language: profile.language,
    },
  });

  const initials = useMemo(() => {
    const parts = profile.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "EM";
    const left = parts[0]?.[0] ?? "";
    const right = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${left}${right}`.toUpperCase() || "EM";
  }, [profile.displayName]);

  const selectedCurrency = currencies.find((c) => c.code === profile.currency);

  const handleAvatarPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Use JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 2MB or smaller.");
      return;
    }
    setAvatarUploading(true);
    try {
      const uploaded = await uploadAvatarFile(file);
      const updated = await patchMe({ avatar: uploaded.url });
      updateProfile({ avatarUrl: updated.avatar || uploaded.url, isDirty: true });
      onUserUpdated(updated);
      toast.success("Avatar uploaded successfully");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to upload avatar."));
    } finally {
      setAvatarUploading(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      updateProfile({
        displayName: values.displayName,
        currency: values.currency,
        timezone: values.timezone,
        language: values.language,
      });
      const updated = await saveProfile();
      onUserUpdated(updated);
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save. Try again."));
    }
  });

  return (
    <SettingsCard title="Profile" description="Manage identity, locale, and account preferences.">
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-3">
          <Label className="mb-1.5 block text-sm font-medium">Avatar</Label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleAvatarPick(e.target.files)}
          />
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-[hsl(222_30%_18%)]">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="outline"
              className="border-[hsl(222_30%_18%)]"
              disabled={avatarUploading}
              onClick={() => inputRef.current?.click()}
            >
              {avatarUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {avatarUploading ? "Uploading..." : "Upload avatar"}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="displayName" className="mb-1.5 block text-sm font-medium">
            Display name
          </Label>
          <Input
            id="displayName"
            className="w-full"
            value={form.watch("displayName")}
            onChange={(e) => {
              form.setValue("displayName", e.target.value, { shouldValidate: true, shouldDirty: true });
              updateProfile({ displayName: e.target.value });
            }}
          />
          {form.formState.errors.displayName?.message ? (
            <p className="text-destructive mt-1.5 text-sm">{form.formState.errors.displayName.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Lock className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input id="email" className="w-full pl-10" disabled value={profile.email || user.email} />
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">Managed by your auth provider.</p>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Currency</Label>
          <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
            <PopoverTrigger>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={currencyOpen}
                className="w-full justify-between border-[hsl(222_30%_18%)] bg-transparent"
              >
                {selectedCurrency ? `${selectedCurrency.code} — ${selectedCurrency.label}` : "Select currency"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search currency..." />
                <CommandList>
                  <CommandEmpty>No currency found.</CommandEmpty>
                  <CommandGroup>
                    {currencies.map((c) => (
                      <CommandItem
                        key={c.code}
                        value={`${c.code} ${c.label}`}
                        onSelect={() => {
                          form.setValue("currency", c.code, { shouldDirty: true, shouldValidate: true });
                          updateProfile({ currency: c.code });
                          setCurrencyOpen(false);
                        }}
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", c.code === profile.currency ? "opacity-100" : "opacity-0")}
                        />
                        {c.code} — {c.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Timezone</Label>
          <Select
            value={form.watch("timezone")}
            onValueChange={(value) => {
              if (!value) return;
              form.setValue("timezone", value, { shouldDirty: true, shouldValidate: true });
              updateProfile({ timezone: value });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {timezoneGroups.map((group) => (
                <SelectGroup key={group.region}>
                  <SelectLabel>{group.region}</SelectLabel>
                  {group.items.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Language</Label>
          <Select
            value={form.watch("language")}
            onValueChange={(value) => {
              if (!value) return;
              form.setValue("language", value, { shouldDirty: true, shouldValidate: true });
              updateProfile({ language: value });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={!profile.isDirty || profile.isSaving}>
          {profile.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {profile.isSaving ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </SettingsCard>
  );
}

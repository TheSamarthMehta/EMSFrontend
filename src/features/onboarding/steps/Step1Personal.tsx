import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Lock, Sparkles, Upload } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

import { uploadAvatarFile } from "@/api/settings";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { DatePickerFooter } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIAssist } from "@/features/onboarding/hooks/useAIAssist";
import { DIAL_CODE_OPTIONS } from "@/lib/completeProfileData";
import { cn } from "@/lib/utils";
import type { OnboardingFormState } from "@/types/onboarding";
import type { PublicUser } from "@/types/user";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

interface Step1PersonalProps {
  userEmail: string;
  onAvatarSessionUser?: (user: PublicUser) => void;
}

export function Step1Personal({ userEmail, onAvatarSessionUser }: Step1PersonalProps) {
  const { control, watch, setValue } = useFormContext<OnboardingFormState>();
  const { formatDisplayName } = useAIAssist();

  const [dobOpen, setDobOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formatBadge, setFormatBadge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = watch("displayName");
  const avatarUrl = watch("avatarUrl");
  const avatarDataUrl = watch("avatarDataUrl");

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "?";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
    return (a + b).toUpperCase().slice(0, 2);
  }, [displayName]);

  const onAvatarFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!AVATAR_MIME.has(file.type)) {
      toast.error("Use JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }
    setAvatarUploading(true);
    try {
      const res = await uploadAvatarFile(file);
      setValue("avatarUrl", res.url, { shouldDirty: true, shouldValidate: true });
      setValue("avatarDataUrl", "", { shouldDirty: true });
      if (res.user) onAvatarSessionUser?.(res.user);
      toast.success("Photo uploaded");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Upload failed."));
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold leading-snug text-white">Personal info</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onAvatarFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onAvatarFiles(e.dataTransfer.files);
        }}
        onClick={() => !avatarUploading && fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(222_30%_18%)] bg-white/[0.03] px-4 py-5 transition-colors hover:border-[hsl(252_87%_67%)]/40 hover:bg-[hsl(252_87%_67%)]/5",
          avatarUploading ? "cursor-wait opacity-80" : "cursor-pointer"
        )}
      >
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 bg-[#0a0f1a]">
          {avatarUrl || avatarDataUrl ? (
            <img src={avatarUrl || avatarDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-indigo-300">
              {initials}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs leading-relaxed text-slate-400">
          <Upload className="h-3.5 w-3.5" />
          <span>{avatarUploading ? "Uploading…" : "Drop JPEG, PNG, or WebP (max 2 MB), or click"}</span>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-5">
          <Label variant="onDark" htmlFor="ob-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Display name
          </Label>
          <div className="flex w-full min-w-0 items-start gap-2">
            <Controller
              name="displayName"
              control={control}
              render={({ field, fieldState }) => (
                <div className="min-w-0 flex-1">
                  <Input
                    id="ob-name"
                    variant="onDark"
                    className="w-full text-white placeholder:text-slate-600"
                    autoComplete="name"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={async () => {
                      field.onBlur();
                      const raw = field.value.trim();
                      if (raw.length < 2) return;
                      try {
                        const formatted = await formatDisplayName.mutateAsync(raw);
                        if (formatted && formatted.trim() !== raw) {
                          setValue("displayName", formatted.trim(), { shouldValidate: true, shouldDirty: true });
                          setFormatBadge(true);
                          window.setTimeout(() => setFormatBadge(false), 2000);
                        }
                      } catch {
                        /* silent */
                      }
                    }}
                  />
                  {fieldState.error?.message ? (
                    <p className="text-destructive mt-1.5 text-sm">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />
            {formatBadge ? (
              <Badge
                variant="secondary"
                className="mt-1 shrink-0 border-[hsl(280_80%_65%)]/25 bg-[hsl(280_80%_65%)]/10 text-xs text-purple-100"
              >
                <Sparkles className="mr-1 inline size-3" />
                Formatted
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <Label variant="onDark" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </Label>
          <div className="relative w-full">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input readOnly value={userEmail} variant="onDark" className="w-full pl-10 text-slate-400" />
          </div>
        </div>

        <div className="space-y-5">
          <Label variant="onDark" className="mb-1.5 block text-sm font-medium text-foreground">
            Phone
          </Label>
          <div className="flex w-full min-w-0 gap-3">
            <Controller
              name="phoneDial"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ? String(v) : field.value)}>
                  <SelectTrigger variant="onDark" className="w-[120px] shrink-0 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAL_CODE_OPTIONS.map((d) => (
                      <SelectItem key={d.dial} value={d.dial}>
                        {d.dial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              name="phoneLocal"
              control={control}
              render={({ field, fieldState }) => (
                <div className="min-w-0 flex-1">
                  <Input
                    {...field}
                    inputMode="tel"
                    placeholder="Optional"
                    variant="onDark"
                    className="w-full text-white placeholder:text-slate-600"
                  />
                  {fieldState.error?.message ? (
                    <p className="text-destructive mt-1.5 text-sm">{fieldState.error.message}</p>
                  ) : null}
                </div>
              )}
            />
          </div>
        </div>

        <div className="space-y-5">
          <Label variant="onDark" className="mb-1.5 block text-sm font-medium text-foreground">
            Date of birth
          </Label>
          <Controller
            name="dob"
            control={control}
            render={({ field }) => (
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger
                  className={cn(
                    "field-control-on-dark flex w-full items-center justify-between gap-2 font-normal text-slate-200 hover:bg-white/[0.08]"
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-left",
                      !field.value && "text-slate-500"
                    )}
                  >
                    {field.value ? format(field.value, "PPP") : "Optional — pick a date"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0 shadow-lg ring-1 ring-border/80" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    defaultMonth={field.value ?? new Date()}
                    onSelect={(d) => {
                      field.onChange(d);
                      setDobOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                    className="rounded-none border-0 bg-transparent p-0 shadow-none"
                  />
                  <DatePickerFooter
                    showClear
                    showSecondary={false}
                    clearLabel="Clear"
                    onClear={() => {
                      field.onChange(undefined);
                      setDobOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>
      </div>
    </div>
  );
}

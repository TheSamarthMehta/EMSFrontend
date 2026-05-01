import { useEffect, useMemo, useRef, useState } from "react";
import { Bug, Lightbulb, MessageCircle, Paintbrush } from "lucide-react";
import { useLocation } from "react-router-dom";

import type { FeedbackAttachmentPayload } from "@/api/feedback";
import { enhanceFeedback } from "@/components/FeedbackWidget/ai/enhanceFeedback";
import { FEEDBACK_PAGE_OPTIONS, TYPE_META } from "@/components/FeedbackWidget/constants";
import {
  buildEmailSubject,
  buildFallbackEnhanced,
  sendFeedbackEmailWithRetry,
} from "@/components/FeedbackWidget/email/sendFeedbackEmail";
import { pageValueToLabel, pathnameToFeedbackPage } from "@/components/FeedbackWidget/pageMapping";
import { SettingsCard } from "@/components/settings/shared/SettingsCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettingsStore } from "@/hooks/useSettingsStore";
import type { EnhancedFeedback, FeedbackType } from "@/types/feedback";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { toast } from "sonner";

const MAX_BYTES = 5 * 1024 * 1024;
const typeIcons = {
  bug: Bug,
  feature: Lightbulb,
  ui: Paintbrush,
  other: MessageCircle,
} as const;

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function FeedbackTab() {
  const location = useLocation();
  const { feedback, updateFeedback, resetFeedback } = useSettingsStore();
  const [attachmentPreview, setAttachmentPreview] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lastError, setLastError] = useState("");
  const [finalSubject, setFinalSubject] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastEnhanced, setLastEnhanced] = useState<EnhancedFeedback | null>(null);

  useEffect(() => {
    updateFeedback({ page: pathnameToFeedbackPage(location.pathname) });
  }, [location.pathname, updateFeedback]);

  const attachmentSizeKb = useMemo(
    () => (feedback.attachment ? (feedback.attachment.size / 1024).toFixed(0) : null),
    [feedback.attachment]
  );

  const setAttachment = async (file: File | null) => {
    if (!file) {
      updateFeedback({ attachment: null });
      setAttachmentPreview("");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Attachment exceeds 5MB.");
      return;
    }
    const preview = await toDataUrl(file);
    setAttachmentPreview(preview);
    updateFeedback({ attachment: file });
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!feedback.type) nextErrors.type = "Choose a feedback type.";
    if (!feedback.subject.trim()) nextErrors.subject = "Subject is required.";
    if (!feedback.description.trim()) nextErrors.description = "Description is required.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const copyFallback = async () => {
    const payload = [
      `Type: ${feedback.type ?? ""}`,
      `Page: ${pageValueToLabel(feedback.page)}`,
      `Subject: ${feedback.subject}`,
      `Description:\n${feedback.description}`,
      `Severity: ${feedback.severity}`,
      feedback.userEmail ? `Email: ${feedback.userEmail}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    await navigator.clipboard.writeText(payload);
    toast.success("Copied to clipboard");
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    updateFeedback({ status: "sending" });
    setLastError("");
    let enhanced: EnhancedFeedback;
    let sentWithoutAiEnhancement = !feedback.aiEnhance;
    try {
      if (feedback.aiEnhance) {
        updateFeedback({ status: "ai-loading" });
        enhanced = await enhanceFeedback({
          type: feedback.type as string,
          page: pageValueToLabel(feedback.page),
          subject: feedback.subject,
          description: feedback.description,
          severity: feedback.severity,
        });
      } else {
        enhanced = buildFallbackEnhanced({
          type: feedback.type as FeedbackType,
          subject: feedback.subject,
          description: feedback.description,
          severity: feedback.severity,
        });
      }
    } catch {
      enhanced = buildFallbackEnhanced({
        type: feedback.type as FeedbackType,
        subject: feedback.subject,
        description: feedback.description,
        severity: feedback.severity,
      });
      sentWithoutAiEnhancement = true;
    }

    try {
      const attachments: FeedbackAttachmentPayload[] | undefined = feedback.attachment
        ? [
            {
              filename: feedback.attachment.name,
              contentType: feedback.attachment.type || "application/octet-stream",
              base64: attachmentPreview.split(",")[1] ?? "",
            },
          ]
        : undefined;

      await sendFeedbackEmailWithRetry({
        raw: {
          type: feedback.type as FeedbackType,
          page: pageValueToLabel(feedback.page),
          subject: feedback.subject,
          description: feedback.description,
          severity: feedback.type === "bug" ? feedback.severity : undefined,
          userEmail: feedback.userEmail,
          pathname: location.pathname,
        },
        enhanced,
        attachments,
        sentWithoutAiEnhancement,
      });
      const subject = buildEmailSubject(feedback.type as string, enhanced);
      setFinalSubject(subject);
      setLastEnhanced(enhanced);
      updateFeedback({ status: "success", enhanced });
      toast.success("Feedback sent!");
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Failed to send feedback");
      setLastError(message);
      updateFeedback({ status: "error" });
    }
  };

  if (feedback.status === "ai-loading" || feedback.status === "sending") {
    return (
      <SettingsCard title="Feedback" description="Submitting your report...">
        <div className="space-y-2 rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/50 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </SettingsCard>
    );
  }

  if (feedback.status === "success" && lastEnhanced) {
    return (
      <SettingsCard title="Feedback" description="Thanks for helping us improve.">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="text-xl">✅</div>
            <div>
              <p className="font-medium">Feedback sent!</p>
              <p className="text-muted-foreground text-sm">Your report reached the product inbox.</p>
            </div>
          </div>
          <div className="rounded-lg border border-[hsl(222_30%_18%)] bg-[hsl(222_40%_10%)]/50 p-4">
            <p className="text-sm font-medium">AI-enhanced subject</p>
            <p className="text-muted-foreground mt-1 text-sm">{finalSubject}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetFeedback();
              setAttachmentPreview("");
              setFinalSubject("");
              setFieldErrors({});
              setLastError("");
              setLastEnhanced(null);
            }}
          >
            Send another feedback
          </Button>
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="Feedback" description="Report issues, suggest features, and share UI improvements.">
      <div className="space-y-5">
        <div>
          <Label className="mb-1.5 block text-sm font-medium">Feedback type</Label>
          <ToggleGroup
            type="single"
            value={feedback.type ?? undefined}
            onValueChange={(value) => {
              if (!value) return;
              updateFeedback({ type: value as FeedbackType });
            }}
            className="flex flex-wrap gap-2"
          >
            {(Object.keys(TYPE_META) as FeedbackType[]).map((key) => {
              const Icon = typeIcons[key];
              return (
                <ToggleGroupItem key={key} value={key} className="h-auto px-3 py-1.5 text-sm">
                  <Icon className="size-4" />
                  {TYPE_META[key].label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          {fieldErrors.type ? <p className="text-destructive mt-1.5 text-sm">{fieldErrors.type}</p> : null}
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Page / location</Label>
          <Select value={feedback.page} onValueChange={(value) => updateFeedback({ page: value as typeof feedback.page })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {feedback.type === "bug" ? (
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Severity</Label>
            <RadioGroup
              value={feedback.severity}
              onValueChange={(value) => updateFeedback({ severity: value as "low" | "medium" | "high" })}
              className="flex flex-row gap-4"
            >
              {(["low", "medium", "high"] as const).map((severity) => (
                <label key={severity} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={severity} />
                  <span className="capitalize">{severity}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        ) : null}

        <div>
          <Label htmlFor="feedbackSubject" className="mb-1.5 block text-sm font-medium">
            Subject
          </Label>
          <Input
            id="feedbackSubject"
            maxLength={80}
            className="w-full"
            value={feedback.subject}
            onChange={(e) => updateFeedback({ subject: e.target.value })}
          />
          <div className="text-muted-foreground mt-1 text-right text-xs">{feedback.subject.length}/80</div>
          {fieldErrors.subject ? <p className="text-destructive mt-1.5 text-sm">{fieldErrors.subject}</p> : null}
        </div>

        <div>
          <Label htmlFor="feedbackDescription" className="mb-1.5 block text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="feedbackDescription"
            rows={4}
            maxLength={1000}
            className="w-full"
            value={feedback.description}
            onChange={(e) => updateFeedback({ description: e.target.value })}
          />
          <div className="text-muted-foreground mt-1 text-right text-xs">{feedback.description.length}/1000</div>
          {fieldErrors.description ? <p className="text-destructive mt-1.5 text-sm">{fieldErrors.description}</p> : null}
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">Attachment</Label>
          <button
            type="button"
            className={`w-full rounded-lg border border-dashed px-4 py-6 text-center ${dragActive ? "border-primary" : "border-[hsl(222_30%_18%)]"}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void setAttachment(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            Drag screenshot here, or click to upload
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void setAttachment(e.target.files?.[0] ?? null)}
          />
          {feedback.attachment ? (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-[hsl(222_30%_18%)] px-2 py-2">
              <img src={attachmentPreview} alt="" className="size-12 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{feedback.attachment.name}</p>
                <p className="text-muted-foreground text-xs">{attachmentSizeKb} KB</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => void setAttachment(null)}>
                Remove
              </Button>
            </div>
          ) : null}
        </div>

        <div>
          <Label className="mb-1.5 block text-sm font-medium">User email</Label>
          <Input
            type="email"
            className="w-full"
            value={feedback.userEmail}
            onChange={(e) => updateFeedback({ userEmail: e.target.value })}
          />
        </div>

        <div className="flex items-start justify-between rounded-lg border border-[hsl(222_30%_18%)] px-3 py-3">
          <div className="pr-3">
            <Label htmlFor="feedbackAi" className="mb-1.5 block text-sm font-medium">
              ✦ AI-enhance my feedback before sending
            </Label>
            <p className="text-muted-foreground text-xs">Claude improves clarity and structure before email delivery.</p>
          </div>
          <Switch
            id="feedbackAi"
            checked={feedback.aiEnhance}
            onCheckedChange={(checked) => updateFeedback({ aiEnhance: checked })}
          />
        </div>

        {feedback.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to send feedback</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{lastError}</p>
              <Button type="button" variant="outline" onClick={() => void copyFallback()}>
                Copy to clipboard
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <Button type="button" className="w-full" onClick={() => void handleSubmit()}>
          Send feedback
        </Button>
      </div>
    </SettingsCard>
  );
}

import { postFeedbackSend } from "@/api/feedback";
import type { FeedbackAttachmentPayload } from "@/api/feedback";
import { FEEDBACK_RECIPIENT_EMAIL } from "@/components/FeedbackWidget/constants";
import type { EnhancedFeedback, FeedbackSeverity, FeedbackType, RawFeedbackPayload } from "@/types/feedback";

function bugSeverityToAssessment(
  s: FeedbackSeverity | undefined
): EnhancedFeedback["severity_assessment"] {
  if (s === "high") return "critical";
  if (s === "low") return "low";
  return "medium";
}

/** When AI is off or fails — still produce a valid EnhancedFeedback for the HTML template. */
export function buildFallbackEnhanced(raw: {
  type: FeedbackType;
  subject: string;
  description: string;
  severity?: FeedbackSeverity;
}): EnhancedFeedback {
  const words = raw.subject.trim().split(/\s+/).filter(Boolean).slice(0, 12).join(" ");
  const one = words || "User feedback";
  return {
    enhanced_subject: raw.subject.trim().slice(0, 60) || "Feedback",
    enhanced_description: raw.description.trim(),
    severity_assessment: raw.type === "bug" ? bugSeverityToAssessment(raw.severity) : "enhancement",
    category_tags: [raw.type, "user-submitted"],
    one_line_summary: one,
    reproduction_steps: null,
    suggested_priority: raw.type === "bug" && raw.severity === "high" ? "P1" : "P2",
    estimated_impact:
      "User-submitted feedback; automated triage was not available for this message.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailHtml(
  raw: RawFeedbackPayload,
  ai: EnhancedFeedback,
  opts?: { sentWithoutAiEnhancement?: boolean }
): string {
  const pageLabel = escapeHtml(raw.page);
  const tags = ai.category_tags.map((t) => escapeHtml(t)).join(", ");
  const userEmail = escapeHtml(raw.userEmail || "Not provided");
  const submitted = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
  const reproBlock =
    raw.type === "bug" && ai.reproduction_steps && ai.reproduction_steps.length > 0
      ? `
<h3 style="color:#f1f5f9">Reproduction Steps</h3>
<ol>${ai.reproduction_steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
`
      : "";

  return `
<h2 style="color:#7c6ff7">📋 Feedback Report — Expense Management App</h2>

<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px">
  <tr><td style="padding:6px 0;color:#64748b;width:140px">Type</td><td><strong>${escapeHtml(raw.type)}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#64748b">Page</td><td>${pageLabel}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b">Route</td><td>${escapeHtml(raw.pathname)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b">Priority</td><td><strong style="color:#ef4444">${escapeHtml(ai.suggested_priority)}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#64748b">Severity</td><td>${escapeHtml(ai.severity_assessment)}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b">Tags</td><td>${tags}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b">User email</td><td>${userEmail}</td></tr>
  <tr><td style="padding:6px 0;color:#64748b">Submitted</td><td>${escapeHtml(submitted)}</td></tr>
</table>

<hr style="border:0.5px solid #1e2d45;margin:16px 0"/>

<h3 style="color:#f1f5f9">Subject</h3>
<p>${escapeHtml(ai.enhanced_subject)}</p>

<h3 style="color:#f1f5f9">Description</h3>
<p>${escapeHtml(ai.enhanced_description).replace(/\n/g, "<br/>")}</p>

${reproBlock}

<h3 style="color:#f1f5f9">Estimated Impact</h3>
<p>${escapeHtml(ai.estimated_impact)}</p>

<hr style="border:0.5px solid #1e2d45;margin:16px 0"/>
<p style="color:#64748b;font-size:12px">${
    opts?.sentWithoutAiEnhancement
      ? "This report was sent from the Expense Management feedback widget without AI enhancement (raw user text)."
      : "This report was auto-enhanced by Claude AI and sent via the Expense Management feedback widget."
  }</p>
`;
}

export function buildEmailSubject(rawType: string, ai: EnhancedFeedback): string {
  const type = rawType.toUpperCase();
  return `[${type}] [${ai.suggested_priority}] ${ai.one_line_summary}`;
}

export async function sendFeedbackEmail(params: {
  raw: RawFeedbackPayload;
  enhanced: EnhancedFeedback;
  attachments?: FeedbackAttachmentPayload[];
  sentWithoutAiEnhancement?: boolean;
}): Promise<void> {
  const { raw, enhanced, attachments, sentWithoutAiEnhancement } = params;
  const subject = buildEmailSubject(raw.type, enhanced);
  const htmlBody = buildEmailHtml(raw, enhanced, {
    sentWithoutAiEnhancement: Boolean(sentWithoutAiEnhancement),
  });

  await postFeedbackSend({
    recipient: FEEDBACK_RECIPIENT_EMAIL,
    subject,
    htmlBody,
    attachments,
    sentWithoutAiEnhancement,
  });
}

/** One retry on transient failure (network / 5xx). */
export async function sendFeedbackEmailWithRetry(params: {
  raw: RawFeedbackPayload;
  enhanced: EnhancedFeedback;
  attachments?: FeedbackAttachmentPayload[];
  sentWithoutAiEnhancement?: boolean;
}): Promise<void> {
  try {
    await sendFeedbackEmail(params);
  } catch (first) {
    try {
      await sendFeedbackEmail(params);
    } catch (second) {
      throw second instanceof Error ? second : new Error(String(first));
    }
  }
}

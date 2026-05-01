export type FeedbackType = "bug" | "feature" | "ui" | "other";

export type FeedbackSeverity = "low" | "medium" | "high";

export type FeedbackStep = "form" | "ai-loading" | "sending" | "success" | "error";

export interface EnhancedFeedback {
  enhanced_subject: string;
  enhanced_description: string;
  severity_assessment: "critical" | "high" | "medium" | "low" | "enhancement";
  category_tags: string[];
  one_line_summary: string;
  reproduction_steps: string[] | null;
  suggested_priority: "P0" | "P1" | "P2" | "P3";
  estimated_impact: string;
}

export interface RawFeedbackPayload {
  type: FeedbackType;
  page: string;
  subject: string;
  description: string;
  severity?: FeedbackSeverity;
  userEmail: string;
  pathname: string;
}

export interface FeedbackAttachment {
  file: File;
  base64: string;
  preview: string;
}

export interface FeedbackWidgetState {
  isOpen: boolean;
  step: FeedbackStep;
  type: FeedbackType | null;
  page: string;
  subject: string;
  description: string;
  severity: FeedbackSeverity;
  attachment: FeedbackAttachment | null;
  attachmentError: string | null;
  userEmail: string;
  aiEnhanceEnabled: boolean;
  enhanced: EnhancedFeedback | null;
  sentWithoutAiEnhancement: boolean;
  error: string | null;
  /** Final email subject used after send */
  finalEmailSubject: string | null;
  fieldShake: boolean;
  invalidFields: Set<string>;
}

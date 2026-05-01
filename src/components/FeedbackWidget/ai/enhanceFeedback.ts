import { callClaudeJSON } from "@/ai/claudeClient";
import type { EnhancedFeedback } from "@/types/feedback";

function isEnhancedFeedback(x: unknown): x is EnhancedFeedback {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.enhanced_subject !== "string" || typeof o.enhanced_description !== "string")
    return false;
  if (typeof o.one_line_summary !== "string" || typeof o.estimated_impact !== "string")
    return false;
  if (!Array.isArray(o.category_tags) || !o.category_tags.every((t) => typeof t === "string"))
    return false;
  const sev = o.severity_assessment;
  if (
    sev !== "critical" &&
    sev !== "high" &&
    sev !== "medium" &&
    sev !== "low" &&
    sev !== "enhancement"
  )
    return false;
  const pr = o.suggested_priority;
  if (pr !== "P0" && pr !== "P1" && pr !== "P2" && pr !== "P3") return false;
  if (o.reproduction_steps !== null && o.reproduction_steps !== undefined) {
    if (!Array.isArray(o.reproduction_steps) || !o.reproduction_steps.every((s) => typeof s === "string"))
      return false;
  }
  return true;
}

export async function enhanceFeedback(raw: {
  type: string;
  page: string;
  subject: string;
  description: string;
  severity?: string;
}): Promise<EnhancedFeedback> {
  const prompt = `
You are a senior product manager reviewing user feedback for an Expense Management web app.

The user submitted this feedback:
- Type: ${raw.type}
- Page: ${raw.page}
- Subject: ${raw.subject}
- Description: ${raw.description}
- Self-rated severity: ${raw.severity ?? "not specified"}

Your job:
1. Rewrite the subject to be clear, specific, and actionable (max 60 chars)
2. Rewrite the description with proper structure — fix grammar, add clarity, keep the user's original intent
3. If it's a bug: extract or infer likely reproduction steps as an array (max 5 steps), else return null
4. Assign a severity_assessment based on potential user impact
5. Assign a suggested_priority: P0 (blocker), P1 (critical), P2 (important), P3 (nice to have)
6. Write a one_line_summary (max 12 words) for the email subject line
7. List 2-4 category_tags as lowercase strings (e.g. "budget-input", "navigation", "validation")
8. Write estimated_impact: 1 sentence describing who is affected and how

Return ONLY valid JSON matching this TypeScript interface (no markdown, no preamble):
{
  "enhanced_subject": string,
  "enhanced_description": string,
  "severity_assessment": "critical" | "high" | "medium" | "low" | "enhancement",
  "category_tags": string[],
  "one_line_summary": string,
  "reproduction_steps": string[] | null,
  "suggested_priority": "P0" | "P1" | "P2" | "P3",
  "estimated_impact": string
}
`;
  const parsed = await callClaudeJSON<unknown>(prompt);
  if (!isEnhancedFeedback(parsed)) {
    throw new Error("Invalid AI response shape");
  }
  return parsed;
}

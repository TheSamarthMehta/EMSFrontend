/**
 * Feedback email + AI enhancement — server-side only.
 *
 * Expected backend behavior:
 * - POST `/ai/claude-json` — runs Claude with the given prompt and returns strict JSON (`{ ok, data }`).
 *   The server must never echo API keys to the client.
 * - POST `/feedback/send` — delivers email to the product inbox (e.g. via Gmail API, SMTP, or
 *   Anthropic Messages API with `mcp_servers` pointing at `https://gmailmcp.googleapis.com/mcp/v1`
 *   as in your infra spec). Attachments are base64 JSON fields; the server should attach them
 *   to the outgoing MIME message.
 */
import { api } from "@/api/client";

export async function postAiClaudeJson<T>(prompt: string): Promise<T> {
  const { data } = await api.post<{ ok: boolean; data?: T; error?: string }>("/ai/claude-json", {
    prompt,
  });
  if (!data.ok || data.data === undefined) {
    throw new Error(data.error || "AI structured response unavailable");
  }
  return data.data;
}

export interface FeedbackAttachmentPayload {
  filename: string;
  contentType: string;
  base64: string;
}

export interface FeedbackSendPayload {
  recipient: string;
  subject: string;
  htmlBody: string;
  attachments?: FeedbackAttachmentPayload[];
  sentWithoutAiEnhancement?: boolean;
}

export async function postFeedbackSend(payload: FeedbackSendPayload): Promise<void> {
  await api.post("/feedback/send", payload);
}

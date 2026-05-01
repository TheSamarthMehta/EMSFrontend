import { postAiClaudeJson } from "@/api/feedback";

/**
 * Generic Claude JSON helper — delegates to backend `/ai/claude-json`.
 * Do not call Anthropic directly from the browser (keys must stay on the server).
 */
export async function callClaudeJSON<T>(prompt: string): Promise<T> {
  return postAiClaudeJson<T>(prompt);
}

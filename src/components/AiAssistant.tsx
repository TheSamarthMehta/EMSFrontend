import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAiChat, useAiStatus } from "@/hooks/useAi";
import type { AiChatTurn } from "@/types/ai";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "How am I doing this month?",
  "Where am I overspending?",
  "Am I on track to save money?",
  "What's my biggest expense category?",
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<AiChatTurn[]>([]);
  const aiStatus = useAiStatus();
  const chat = useAiChat();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const aiEnabled = aiStatus.data?.enabled ?? false;
  const isPending = chat.isPending;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, history.length, isPending]);

  function send(message: string): void {
    const trimmed = message.trim();
    if (!trimmed || isPending) return;

    const nextHistory: AiChatTurn[] = [...history, { role: "user", text: trimmed }];
    setHistory(nextHistory);
    setDraft("");
    chat.mutate(
      { message: trimmed, history },
      {
        onSuccess: (res) => {
          setHistory((prev) => [...prev, { role: "model", text: res.reply }]);
        },
        onError: () => {
          setHistory((prev) => [
            ...prev,
            {
              role: "model",
              text: "Sorry — I couldn't reach the AI service. Please try again in a moment.",
            },
          ]);
        },
      }
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    send(draft);
  }

  function reset(): void {
    setHistory([]);
    setDraft("");
    chat.reset();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 gap-1.5 px-2.5 text-[11px] focus-visible:ring-2"
            )}
            aria-label="Open assistant"
          />
        }
      >
        <MessageCircle className="size-3 text-foreground/70" />
        <span className="hidden sm:inline">Assistant</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card">
              <MessageCircle className="size-3.5 text-foreground/70" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm">Assistant</SheetTitle>
              <SheetDescription className="text-[11px]">
                Ask about your spending, budgets, and savings.
              </SheetDescription>
            </div>
            {history.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 px-2 text-[11px]"
                onClick={reset}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!aiStatus.isPending && !aiEnabled ? (
            <div className="rounded-md border border-border bg-card/50 p-3 text-xs text-muted-foreground">
              The assistant is currently disabled on this server.
            </div>
          ) : null}

          {aiEnabled && history.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Ask anything about your spending — I&apos;ll use the last 90 days of your data.
              </p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs text-foreground/85 transition-colors hover:border-foreground/20 hover:bg-white/[0.04] hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((turn, i) => (
                <ChatBubble key={i} turn={turn} />
              ))}
              {isPending ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Thinking…
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t border-border bg-card px-3 py-2.5"
          aria-label="Message the AI assistant"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={aiEnabled ? "Ask about your spending…" : "AI is disabled"}
              disabled={!aiEnabled || isPending}
              maxLength={1000}
              className="field-control h-9 flex-1 text-sm"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={!aiEnabled || !draft.trim() || isPending}
              aria-label="Send message"
              className="size-9 shrink-0"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
          <SheetClose className="hidden" />
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ChatBubble({ turn }: { turn: AiChatTurn }) {
  const isUser = turn.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed",
          isUser
            ? "bg-foreground/[0.07] text-foreground"
            : "border border-border bg-card text-foreground/90"
        )}
      >
        {turn.text}
      </div>
    </div>
  );
}

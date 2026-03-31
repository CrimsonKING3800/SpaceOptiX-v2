"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MessageCircle, Send, X } from "lucide-react";

type UiMessageRole = "user" | "assistant";

interface UiMessage {
  role: UiMessageRole;
  content: string;
}

/**
 * Lightweight markdown renderer for chatbot messages.
 * Supports: bold, inline code, numbered lists, bullet lists, line breaks.
 */
function renderMarkdown(text: string): React.ReactNode {
  // Split into lines
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ol" | "ul" | null = null;
  let olStart = 1;

  function flushList() {
    if (listType === "ol" && listItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} start={olStart} className="my-1 ml-4 list-decimal space-y-0.5">
          {listItems}
        </ol>,
      );
    } else if (listType === "ul" && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-1 ml-4 list-disc space-y-0.5">
          {listItems}
        </ul>,
      );
    }
    listItems = [];
    listType = null;
  }

  function formatInline(str: string): React.ReactNode {
    // Process bold (**text**), inline code (`text`)
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index));
      }
      if (match[2]) {
        // Bold
        parts.push(<strong key={match.index}>{match[2]}</strong>);
      } else if (match[3]) {
        // Inline code
        parts.push(
          <code key={match.index} className="rounded bg-background/50 px-1 py-0.5 text-xs font-mono">
            {match[3]}
          </code>,
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex));
    }
    return parts.length === 1 ? parts[0] : parts;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for numbered list (1. item)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        olStart = parseInt(olMatch[1]);
      }
      listItems.push(<li key={`li-${i}`}>{formatInline(olMatch[2])}</li>);
      continue;
    }

    // Check for bullet list (- item, * item)
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(<li key={`li-${i}`}>{formatInline(ulMatch[1])}</li>);
      continue;
    }

    // Not a list item — flush any open list
    flushList();

    if (trimmed === "") {
      // Empty line = spacing
      elements.push(<div key={`br-${i}`} className="h-1" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="my-0.5">
          {formatInline(trimmed)}
        </p>,
      );
    }
  }

  flushList();
  return elements;
}

const MAX_MESSAGES = 16;

function getStarterPrompts(role: string | undefined): string[] {
  if (role === "student") {
    return [
      "How do I book a venue from the dashboard?",
      "What do pending_professor and pending_admin mean?",
    ];
  }

  if (role === "professor") {
    return [
      "How do I review and approve student requests?",
      "What happens after I approve a booking?",
    ];
  }

  return [
    "How can I manage users and venues efficiently?",
    "How do booking approvals work at admin stage?",
  ];
}

export function DashboardAiHelper() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I am your SpaceOptiX AI helper. Ask me about bookings, venues, approvals, dashboard actions, or role permissions.",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  const starterPrompts = useMemo(
    () => getStarterPrompts(user?.role),
    [user?.role],
  );

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    const nextMessages = [
      ...messages,
      {
        role: "user" as const,
        content: trimmed,
      },
    ].slice(-MAX_MESSAGES);

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorText =
          typeof data?.error === "string"
            ? data.error
            : "Could not get a response right now.";
        setMessages((prev) =>
          [
            ...prev,
            {
              role: "assistant" as const,
              content: errorText,
            },
          ].slice(-MAX_MESSAGES),
        );
        return;
      }

      const assistantText =
        typeof data?.reply === "string" && data.reply.trim().length > 0
          ? data.reply.trim()
          : "I can help with SpaceOptiX dashboard tasks. Try asking in a different way.";

      setMessages((prev) =>
        [
          ...prev,
          {
            role: "assistant" as const,
            content: assistantText,
          },
        ].slice(-MAX_MESSAGES),
      );
    } catch {
      setMessages((prev) =>
        [
          ...prev,
          {
            role: "assistant" as const,
            content: "Network error while contacting chatbot.",
          },
        ].slice(-MAX_MESSAGES),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 sm:right-6 sm:bottom-6">
      <div className="pointer-events-auto relative">
        {open && (
          <div className="absolute right-0 bottom-16 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    AI Helper
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {user?.role || "user"} support
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-72 px-3 py-3">
              <div className="space-y-2.5">
                {messages.map((message, idx) => (
                  <div
                    key={`${message.role}-${idx}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.role === "assistant"
                        ? renderMarkdown(message.content)
                        : message.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="space-y-2 border-t border-border p-3">
              <div className="flex flex-wrap gap-1.5">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    disabled={loading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about SpaceOptiX..."
                  disabled={loading}
                  maxLength={2000}
                  className="h-9"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9"
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}

        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

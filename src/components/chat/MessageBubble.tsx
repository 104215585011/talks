"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Volume2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { AudioWaveform } from "./AudioWaveform";

const MAX_ASSISTANT_CONTENT_HEIGHT = 260;

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type MessageBubbleProps = {
  characterName: string;
  isSpeaking?: boolean;
  isStreaming?: boolean;
  message: ChatMessage;
  onSpeak?: (message: ChatMessage) => void;
};

export function MessageBubble({
  characterName,
  isSpeaking = false,
  isStreaming = false,
  message,
  onSpeak
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const showTypingIndicator = !isUser && isStreaming && message.content.trim().length === 0;

  useEffect(() => {
    if (isUser || !contentRef.current) {
      setOverflows(false);
      setExpanded(false);
      return;
    }

    setOverflows(contentRef.current.scrollHeight > MAX_ASSISTANT_CONTENT_HEIGHT);
    setExpanded(false);
  }, [isUser, message.content]);

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? <Avatar isActive={isStreaming} name={characterName} /> : null}
      <div className={cn("max-w-[min(42rem,82vw)]", isUser && "order-first")}>
        <div
          className={cn(
            "relative overflow-hidden rounded-bubble text-sm leading-7",
            isUser
              ? "bg-user-message text-white shadow-glow before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-white/55 before:content-['']"
              : "glass-panel border-l-2 border-l-brand-accent border-brand-accent/20 text-slate-100 shadow-glow-cyan"
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden px-4 py-3 transition-[max-height] duration-300 ease-out",
              !isUser && overflows && !expanded && "pb-10"
            )}
            data-testid={!isUser ? "assistant-message-content" : undefined}
            ref={!isUser ? contentRef : undefined}
            style={
              !isUser && overflows
                ? { maxHeight: expanded ? "none" : `${MAX_ASSISTANT_CONTENT_HEIGHT}px` }
                : undefined
            }
          >
            {showTypingIndicator ? (
              <span
                aria-label="AI is typing"
                className="inline-flex items-center gap-1 py-1"
                role="status"
              >
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-accent [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-accent [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-accent" />
              </span>
            ) : (
              <ReactMarkdown
                components={{
                  code: ({ children }) => (
                    <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-brand-accent">
                      {children}
                    </code>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-brand-accent">{children}</strong>
                  ),
                  ul: ({ children }) => <ul className="ml-5 list-disc">{children}</ul>
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
            {isStreaming && !showTypingIndicator ? (
              <span className="ml-1 inline-block h-4 w-2 animate-cursor-blink bg-brand-accent align-middle" />
            ) : null}
            {!isUser && overflows && !expanded ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(15,16,28,0.96)] to-transparent"
                data-testid="assistant-collapse-fade"
              />
            ) : null}
          </div>
          {!isUser && overflows ? (
            <button
              aria-label={expanded ? "Show less" : "Show more"}
              className="flex w-full items-center justify-center border-t border-white/[0.08] bg-white/[0.025] px-4 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-white"
              onClick={() => setExpanded((current) => !current)}
              type="button"
            >
              {expanded ? "Show less ▴" : "Show more ▾"}
            </button>
          ) : null}
          {!isUser ? (
            <div
              className="flex items-center gap-2 border-t border-white/[0.08] bg-white/[0.035] px-4 py-2.5"
              data-testid="assistant-audio-footer"
            >
              <AudioWaveform isPlaying={isStreaming || isSpeaking} />
              {onSpeak ? (
                <button
                  aria-label={`Play ${characterName} voice`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.08] text-slate-200 transition hover:border-brand-accent/60 hover:text-white"
                  disabled={!message.content.trim() || isSpeaking}
                  onClick={() => onSpeak(message)}
                  type="button"
                >
                  <Volume2 size={15} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

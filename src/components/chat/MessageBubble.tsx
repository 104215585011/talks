"use client";

import ReactMarkdown from "react-markdown";
import { Volume2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { AudioWaveform } from "./AudioWaveform";

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

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? <Avatar isActive={isStreaming} name={characterName} /> : null}
      <div className={cn("max-w-[min(42rem,82vw)]", isUser && "order-first")}>
        <div
          className={cn(
            "rounded-bubble px-4 py-3 text-sm leading-7",
            isUser
              ? "bg-user-message text-white shadow-glow"
              : "glass-panel border-brand-accent/20 text-slate-100 shadow-glow-cyan"
          )}
        >
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
          {isStreaming ? (
            <span className="ml-1 inline-block h-4 w-2 animate-cursor-blink bg-brand-accent align-middle" />
          ) : null}
        </div>
        {!isUser ? (
          <div className="mt-2 flex items-center gap-2">
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
  );
}

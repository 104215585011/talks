"use client";

import {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Languages, Menu, Mic, Send, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { readAuthSession } from "@/lib/auth/client-session";
import type { LinguaCharacter } from "@/lib/characters/characters";
import { parseSseChunk } from "@/lib/chat/sse";
import { playAudioResponse } from "@/lib/speech/browser-audio";
import { cn } from "@/lib/utils/cn";
import { LearningFeedback, type LearningFeedbackData } from "./LearningFeedback";
import { MessageBubble, type ChatMessage } from "./MessageBubble";

type ChatWorkspaceProps = {
  characters: LinguaCharacter[];
};

type CharacterSession = {
  hasMoreHistory: boolean;
  historyLoaded: boolean;
  historyPage: number;
  isHistoryLoading: boolean;
  learningFeedback: Record<string, LearningFeedbackData>;
  messages: ChatMessage[];
  sessionId: string | undefined;
};

type BrowserSpeechRecognition = SpeechRecognition & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

const EMPTY_CHARACTER_SESSION: CharacterSession = {
  hasMoreHistory: false,
  historyLoaded: false,
  historyPage: 0,
  isHistoryLoading: false,
  learningFeedback: {},
  messages: [],
  sessionId: undefined
};

type HistoryMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
};

type HistorySession = {
  id: string;
  characterId: string;
  hasMoreMessages?: boolean;
  messages?: HistoryMessage[];
};

type HistoryResponse = {
  page: number;
  pageSize: number;
  sessions: HistorySession[];
  total: number;
};

const mentorAccentByCharacter: Record<string, string> = {
  carlos: "rgba(255, 200, 60, 0.9)",
  emma: "rgba(0, 229, 255, 0.95)",
  jake: "rgba(26, 115, 232, 0.95)",
  kenji: "rgba(69, 245, 165, 0.9)",
  sophie: "rgba(124, 77, 255, 0.95)"
};

const CHAT_BOTTOM_THRESHOLD = 80;

export function ChatWorkspace({ characters }: ChatWorkspaceProps) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMentorDrawerOpen, setIsMentorDrawerOpen] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? "emma");
  const [sessions, setSessions] = useState<Record<string, CharacterSession>>({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [atmosphere, setAtmosphere] = useState({ x: 48, y: 38 });
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const shouldFollowScrollRef = useRef(true);

  useEffect(() => {
    const session = readAuthSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setAccessToken(session.accessToken);
    setSelectedCharacterId(
      window.localStorage.getItem("linguaai.characterId") ?? characters[0]?.id ?? "emma"
    );
  }, [characters, router]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? characters[0],
    [characters, selectedCharacterId]
  );
  const currentSession = sessions[selectedCharacterId] ?? EMPTY_CHARACTER_SESSION;
  const learningFeedback = currentSession.learningFeedback;
  const messages = currentSession.messages;

  function isMessagesNearBottom() {
    const element = messagesScrollRef.current;

    if (!element) {
      return true;
    }

    return element.scrollHeight - element.scrollTop - element.clientHeight < CHAT_BOTTOM_THRESHOLD;
  }

  function scrollToBottom(smooth = true) {
    if (typeof messagesEndRef.current?.scrollIntoView !== "function") {
      return;
    }

    messagesEndRef.current.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end"
    });
  }

  useEffect(() => {
    if (shouldFollowScrollRef.current || isMessagesNearBottom()) {
      shouldFollowScrollRef.current = true;
      setShowScrollButton(false);
      scrollToBottom(true);
      return;
    }

    if (messages.length > 0) {
      setShowScrollButton(true);
    }
    // The scroll helpers use refs and should run only when rendered messages/streaming change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, messages]);

  useEffect(() => {
    shouldFollowScrollRef.current = true;
    setShowScrollButton(false);
    window.requestAnimationFrame(() => scrollToBottom(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacterId]);

  useEffect(() => {
    if (!accessToken || !selectedCharacter) {
      return;
    }

    const session = sessions[selectedCharacter.id] ?? EMPTY_CHARACTER_SESSION;

    if (session.historyLoaded || session.isHistoryLoading) {
      return;
    }

    void loadCharacterHistory(selectedCharacter.id, 1);
    // loadCharacterHistory reads the same sessions snapshot already listed here;
    // adding the function identity would turn every state write into a duplicate fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedCharacter, sessions]);

  function updateCharacterSession(
    characterId: string,
    update: (session: CharacterSession) => CharacterSession
  ) {
    setSessions((current) => {
      const existingSession = current[characterId] ?? EMPTY_CHARACTER_SESSION;

      return {
        ...current,
        [characterId]: update(existingSession)
      };
    });
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();

    if (!text || !accessToken || !selectedCharacter) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: ""
    };
    const characterId = selectedCharacter.id;
    const requestSessionId = currentSession.sessionId;

    updateCharacterSession(characterId, (session) => {
      const nextLearningFeedback = { ...session.learningFeedback };
      delete nextLearningFeedback[assistantMessage.id];

      return {
        ...session,
        learningFeedback: nextLearningFeedback,
        messages: [...session.messages, userMessage, assistantMessage]
      };
    });
    shouldFollowScrollRef.current = true;
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat/message", {
        body: JSON.stringify({
          characterId,
          message: text,
          sessionId: requestSessionId
        }),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let remainder = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const parsed = parseSseChunk(remainder + decoder.decode(value, { stream: true }));
        remainder = parsed.remainder;

        for (const eventPayload of parsed.events) {
          if (
            eventPayload.event === "delta" &&
            typeof eventPayload.data === "object" &&
            eventPayload.data
          ) {
            const delta = "text" in eventPayload.data ? String(eventPayload.data.text) : "";
            updateCharacterSession(characterId, (session) => ({
              ...session,
              messages: session.messages.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: message.content + delta }
                  : message
              )
            }));
          }

          if (
            eventPayload.event === "done" &&
            typeof eventPayload.data === "object" &&
            eventPayload.data
          ) {
            const donePayload = eventPayload.data;
            const nextSessionId =
              "sessionId" in donePayload && typeof donePayload.sessionId === "string"
                ? donePayload.sessionId
                : undefined;
            const assistantText =
              "assistantText" in donePayload && typeof donePayload.assistantText === "string"
                ? donePayload.assistantText
                : undefined;

            updateCharacterSession(characterId, (session) => ({
              ...session,
              learningFeedback: {
                ...session.learningFeedback,
                [assistantMessage.id]: {
                  corrections: toStringArray(donePayload, "corrections"),
                  newWords: toStringArray(donePayload, "newWords")
                }
              },
              messages: assistantText
                ? session.messages.map((message) =>
                    message.id === assistantMessage.id
                      ? { ...message, content: assistantText }
                      : message
                  )
                : session.messages,
              sessionId: nextSessionId ?? session.sessionId
            }));
          }
        }
      }
    } catch {
      updateCharacterSession(characterId, (session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: "The conversation stream could not be completed. Please try again."
              }
            : message
        )
      }));
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCurrentInput();
  }

  async function submitCurrentInput() {
    const text = input;
    setInput("");
    await sendMessage(text);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!isStreaming && input.trim()) {
        void submitCurrentInput();
      }
    }
  }

  function handleMessagesScroll() {
    const nearBottom = isMessagesNearBottom();

    shouldFollowScrollRef.current = nearBottom;

    if (nearBottom) {
      setShowScrollButton(false);
    }
  }

  function handleJumpToLatest() {
    shouldFollowScrollRef.current = true;
    setShowScrollButton(false);
    scrollToBottom(true);
  }

  function handleAtmosphereMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    setAtmosphere({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100)
    });
  }

  async function loadCharacterHistory(characterId: string, page: number) {
    if (!accessToken) {
      return;
    }

    const session = sessions[characterId] ?? EMPTY_CHARACTER_SESSION;
    const loadingEarlier = page > 1;
    const scrollElement = messagesScrollRef.current;
    const previousScrollHeight = scrollElement?.scrollHeight ?? 0;

    if (loadingEarlier && !session.sessionId) {
      return;
    }

    updateCharacterSession(characterId, (current) => ({
      ...current,
      isHistoryLoading: true
    }));

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20"
      });

      if (loadingEarlier && session.sessionId) {
        params.set("sessionId", session.sessionId);
      }

      const response = await fetch(`/api/chat/history?${params.toString()}`, {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("History request failed");
      }

      const payload = (await response.json()) as HistoryResponse;
      const historySession = payload.sessions.find(
        (candidate) => candidate.characterId === characterId
      );
      const restoredMessages = (historySession?.messages ?? [])
        .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
        .map((message) => ({
          id: message.id,
          role: message.role === "ASSISTANT" ? "assistant" : "user",
          content: message.content
        })) satisfies ChatMessage[];

      updateCharacterSession(characterId, (current) => {
        const shouldKeepCurrentMessages = page === 1 && current.messages.length > 0;
        const nextMessages =
          page === 1
            ? shouldKeepCurrentMessages
              ? current.messages
              : restoredMessages
            : mergeHistoryMessages(restoredMessages, current.messages);

        return {
          ...current,
          hasMoreHistory: Boolean(historySession?.hasMoreMessages),
          historyLoaded: true,
          historyPage: historySession ? page : current.historyPage || 1,
          isHistoryLoading: false,
          messages: nextMessages,
          sessionId: historySession?.id ?? current.sessionId
        };
      });

      if (loadingEarlier && scrollElement && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          scrollElement.scrollTop += scrollElement.scrollHeight - previousScrollHeight;
        });
      }
    } catch {
      updateCharacterSession(characterId, (current) => ({
        ...current,
        historyLoaded: true,
        isHistoryLoading: false
      }));
    }
  }

  async function playAssistantAudio(message: ChatMessage) {
    if (!accessToken || !selectedCharacter || speakingMessageId) {
      return;
    }

    setSpeakingMessageId(message.id);

    try {
      const response = await fetch("/api/speech/synthesize", {
        body: JSON.stringify({
          characterId: selectedCharacter.id,
          text: message.content
        }),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      await playAudioResponse(response, {
        onEnd: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null)
      });
    } catch {
      setSpeakingMessageId(null);
    }
  }

  function startTimer() {
    setRecordingSeconds(0);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);
  }

  function stopTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startVoiceInput() {
    if (isRecording || isRecognizing) {
      return;
    }

    setRecognitionError(null);
    setIsRecording(true);
    startTimer();

    const browserRecognition = createBrowserSpeechRecognition(
      selectedCharacter?.language ?? "en-US"
    );

    if (browserRecognition) {
      recognitionRef.current = browserRecognition;
      browserRecognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();

        if (transcript) {
          setInput(transcript);
        }
      };
      browserRecognition.onerror = () => {
        setRecognitionError("Microphone permission or speech recognition failed.");
        setIsRecording(false);
        stopTimer();
      };
      browserRecognition.onend = () => {
        setIsRecording(false);
        stopTimer();
      };
      browserRecognition.start();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stopTimer();
        stream.getTracks().forEach((track) => track.stop());
        await recognizeRecordedAudio(
          new Blob(recordedChunksRef.current, { type: recorder.mimeType })
        );
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      setIsRecording(false);
      stopTimer();
      setRecognitionError("Microphone permission was denied.");
    }
  }

  async function stopVoiceInput() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }

  async function recognizeRecordedAudio(blob: Blob) {
    if (!accessToken || !selectedCharacter) {
      return;
    }

    setIsRecognizing(true);

    try {
      const audioBase64 = await blobToBase64(blob);
      const response = await fetch("/api/speech/recognize", {
        body: JSON.stringify({
          audioBase64,
          language: characterLanguageToLocale(selectedCharacter.language),
          mimeType: blob.type || "audio/webm"
        }),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("ASR request failed");
      }

      const payload = (await response.json()) as { transcript?: string };

      if (payload.transcript) {
        setInput(payload.transcript);
        await sendMessage(payload.transcript);
      }
    } catch {
      setRecognitionError("Speech recognition failed. Please type your message.");
    } finally {
      setIsRecognizing(false);
    }
  }

  if (!selectedCharacter) {
    return null;
  }

  function selectCharacter(characterId: string) {
    setSelectedCharacterId(characterId);
    setSpeakingMessageId(null);
    window.localStorage.setItem("linguaai.characterId", characterId);
    setIsMentorDrawerOpen(false);
  }

  const mentorList = (
    <div className="mt-4 space-y-2">
      {characters.map((character) => {
        const isSelected = selectedCharacterId === character.id;

        return (
          <button
            className={cn(
              "w-full rounded-control border-l-2 px-3 py-3 text-left text-sm transition hover:bg-white/10",
              isSelected
                ? "bg-white/[0.07] text-white shadow-[0_12px_34px_rgba(0,229,255,0.12)]"
                : "border-l-transparent text-slate-300"
            )}
            key={character.id}
            onClick={() => selectCharacter(character.id)}
            style={{
              borderLeftColor: isSelected
                ? mentorAccentByCharacter[character.id] ?? "rgba(0, 229, 255, 0.95)"
                : "transparent"
            }}
            type="button"
          >
            <span className="block font-semibold">{character.name}</span>
            <span className={cn("block text-xs", isSelected ? "text-slate-300" : "text-slate-400")}>
              {character.language}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className="relative grid h-full min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden rounded-lg lg:grid-cols-[18rem_1fr]"
      data-testid="chat-workspace-shell"
      onMouseMove={handleAtmosphereMove}
    >
      <div
        aria-hidden="true"
        className="bg-chat-atmosphere pointer-events-none absolute inset-0 opacity-60 transition-[background] duration-300"
        data-testid="chat-atmosphere"
        style={
          {
            "--chat-glow-x": `${atmosphere.x}%`,
            "--chat-glow-y": `${atmosphere.y}%`
          } as CSSProperties
        }
      />
      <aside className="glass-panel hidden min-h-0 overflow-y-auto rounded-lg p-4 lg:block">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-accent">Mentor</p>
        {mentorList}
      </aside>

      {isMentorDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close mentor drawer"
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMentorDrawerOpen(false)}
            type="button"
          />
          <section
            aria-label="Choose mentor"
            aria-modal="true"
            className="glass-panel absolute inset-y-0 left-0 w-[min(20rem,86vw)] rounded-r-lg border-r border-white/15 p-4 shadow-glow"
            role="dialog"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-accent">
                Mentor
              </p>
              <Button
                aria-label="Close mentor drawer"
                icon={<X size={17} />}
                onClick={() => setIsMentorDrawerOpen(false)}
                size="icon"
                variant="ghost"
              >
                Close mentor drawer
              </Button>
            </div>
            {mentorList}
          </section>
        </div>
      ) : null}

      <section
        className="glass-panel relative flex min-h-0 flex-col overflow-hidden rounded-lg"
        data-testid="chat-panel"
      >
        <header className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Choose mentor"
              className="lg:hidden"
              icon={<Menu size={17} />}
              onClick={() => setIsMentorDrawerOpen(true)}
              size="icon"
              variant="secondary"
            >
              Choose mentor
            </Button>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-white">
                {selectedCharacter.name}
              </p>
              <p className="truncate text-sm text-slate-400">{selectedCharacter.style}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <TooltipIconButton
              ariaLabel="Hold to record voice input"
              icon={<Mic size={17} />}
              label="Voice input"
              onPointerDown={startVoiceInput}
              onPointerLeave={stopVoiceInput}
              onPointerUp={stopVoiceInput}
            />
            <TooltipIconButton
              ariaLabel="Translate message"
              icon={<Languages size={17} />}
              label="Translate"
            />
            <TooltipIconButton
              ariaLabel="Vocabulary tools"
              icon={<Sparkles size={17} />}
              label="Vocabulary"
            />
          </div>
        </header>

        <div
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6"
          data-testid="chat-message-scroll"
          onScroll={handleMessagesScroll}
          ref={messagesScrollRef}
        >
          {currentSession.isHistoryLoading ? (
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-accent" />
            </div>
          ) : null}

          {currentSession.hasMoreHistory && messages.length > 0 ? (
            <div className="flex justify-center">
              <Button
                disabled={currentSession.isHistoryLoading}
                onClick={() =>
                  void loadCharacterHistory(selectedCharacter.id, currentSession.historyPage + 1)
                }
                size="sm"
                variant="secondary"
              >
                Load earlier messages
              </Button>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col justify-center text-center">
              <p className="font-display text-3xl font-semibold text-white">
                Start with one sentence.
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Send a sentence, question, or short scenario. Your mentor will reply live and leave
                useful notes after the answer.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id}>
                <MessageBubble
                  characterName={selectedCharacter.name}
                  isSpeaking={speakingMessageId === message.id}
                  isStreaming={
                    isStreaming && index === messages.length - 1 && message.role === "assistant"
                  }
                  message={message}
                  onSpeak={message.role === "assistant" ? playAssistantAudio : undefined}
                />
                {message.role === "assistant" && learningFeedback[message.id] ? (
                  <LearningFeedback feedback={learningFeedback[message.id]} />
                ) : null}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {showScrollButton ? (
          <button
            aria-label="Jump to latest message"
            className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 animate-bounce rounded-full bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(26,115,232,0.35)] transition hover:bg-[#247df1]"
            onClick={handleJumpToLatest}
            type="button"
          >
            ↓ 新消息
          </button>
        ) : null}

        <form
          className="flex-shrink-0 border-t border-white/10 p-4"
          data-testid="chat-composer"
          onSubmit={handleSubmit}
        >
          <div className="flex gap-3">
            <textarea
              className="min-h-12 flex-1 resize-none rounded-control border border-white/[0.15] bg-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:focus-ring focus:ring-1 focus:ring-brand-accent"
              disabled={isStreaming}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={`Message ${selectedCharacter.name}`}
              value={input}
            />
            <Button
              aria-label={
                isRecording ? "Release to send voice input" : "Hold to record voice input"
              }
              className={isRecording ? "shadow-glow-cyan" : ""}
              icon={<Mic size={16} />}
              onPointerDown={startVoiceInput}
              onPointerLeave={stopVoiceInput}
              onPointerUp={stopVoiceInput}
              size="icon"
              type="button"
              variant={isRecording ? "primary" : "secondary"}
            >
              Voice input
            </Button>
            <Button disabled={isStreaming || !input.trim()} icon={<Send size={16} />} type="submit">
              Send
            </Button>
          </div>
          {isRecording || isRecognizing || recognitionError ? (
            <p className="mt-3 text-sm text-slate-300">
              {isRecording ? `Recording ${recordingSeconds}s. Release to recognize.` : null}
              {isRecognizing ? "Recognizing speech..." : null}
              {recognitionError ? recognitionError : null}
            </p>
          ) : null}
          <p className="mt-2 text-right text-xs text-slate-500">Enter 发送 · Shift+Enter 换行</p>
        </form>
      </section>
    </div>
  );
}

type TooltipIconButtonProps = {
  ariaLabel: string;
  icon: ReactNode;
  label: string;
  onPointerDown?: () => void;
  onPointerLeave?: () => void;
  onPointerUp?: () => void;
};

function TooltipIconButton({
  ariaLabel,
  icon,
  label,
  onPointerDown,
  onPointerLeave,
  onPointerUp
}: TooltipIconButtonProps) {
  return (
    <span className="group relative inline-flex">
      <Button
        aria-label={ariaLabel}
        icon={icon}
        onPointerDown={onPointerDown}
        onPointerLeave={onPointerLeave}
        onPointerUp={onPointerUp}
        size="icon"
        title={label}
        variant="ghost"
      >
        {label}
      </Button>
      <span className="pointer-events-none absolute right-0 top-12 z-20 whitespace-nowrap rounded-control border border-white/[0.12] bg-[#0A0E1A]/95 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-glow-cyan transition group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}

function toStringArray(data: object, key: string) {
  return key in data && Array.isArray(data[key as keyof typeof data])
    ? (data[key as keyof typeof data] as unknown[]).filter(
        (item): item is string => typeof item === "string"
      )
    : [];
}

function mergeHistoryMessages(olderMessages: ChatMessage[], currentMessages: ChatMessage[]) {
  const seen = new Set<string>();

  return [...olderMessages, ...currentMessages].filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  });
}

function characterLanguageToLocale(language: string) {
  const map: Record<string, string> = {
    "English (UK)": "en-GB",
    "English (US)": "en-US",
    French: "fr-FR",
    Japanese: "ja-JP",
    "Spanish (Mexico)": "es-MX"
  };

  return map[language] ?? "en-US";
}

function createBrowserSpeechRecognition(language: string) {
  const SpeechRecognitionConstructor =
    window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;

  if (!SpeechRecognitionConstructor) {
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = characterLanguageToLocale(language);

  return recognition;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read audio"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? (result.split(",")[1] ?? "") : result);
    };
    reader.readAsDataURL(blob);
  });
}

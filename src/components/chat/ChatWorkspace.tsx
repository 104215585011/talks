"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Languages, Menu, Mic, Send, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { readAuthSession } from "@/lib/auth/client-session";
import type { LinguaCharacter } from "@/lib/characters/characters";
import { parseSseChunk } from "@/lib/chat/sse";
import { playAudioResponse } from "@/lib/speech/browser-audio";
import { LearningFeedback, type LearningFeedbackData } from "./LearningFeedback";
import { MessageBubble, type ChatMessage } from "./MessageBubble";

type ChatWorkspaceProps = {
  characters: LinguaCharacter[];
};

type BrowserSpeechRecognition = SpeechRecognition & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

export function ChatWorkspace({ characters }: ChatWorkspaceProps) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMentorDrawerOpen, setIsMentorDrawerOpen] = useState(false);
  const [learningFeedback, setLearningFeedback] = useState<Record<string, LearningFeedbackData>>(
    {}
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? "emma");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

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

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setLearningFeedback((current) => {
      const next = { ...current };
      delete next[assistantMessage.id];
      return next;
    });
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat/message", {
        body: JSON.stringify({
          characterId: selectedCharacter.id,
          message: text,
          sessionId
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
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: message.content + delta }
                  : message
              )
            );
          }

          if (
            eventPayload.event === "done" &&
            typeof eventPayload.data === "object" &&
            eventPayload.data
          ) {
            const donePayload = eventPayload.data;

            if ("sessionId" in donePayload && typeof donePayload.sessionId === "string") {
              setSessionId(donePayload.sessionId);
            }

            setLearningFeedback((current) => ({
              ...current,
              [assistantMessage.id]: {
                corrections: toStringArray(donePayload, "corrections"),
                newWords: toStringArray(donePayload, "newWords")
              }
            }));
          }
        }
      }
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: "The conversation stream could not be completed. Please try again."
              }
            : message
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input;
    setInput("");
    await sendMessage(text);
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
    window.localStorage.setItem("linguaai.characterId", characterId);
    setIsMentorDrawerOpen(false);
  }

  const mentorList = (
    <div className="mt-4 space-y-2">
      {characters.map((character) => (
        <button
          className={`w-full rounded-control px-3 py-3 text-left text-sm transition hover:bg-white/10 ${
            selectedCharacterId === character.id
              ? "bg-white/[0.12] text-white shadow-glow"
              : "text-slate-300"
          }`}
          key={character.id}
          onClick={() => selectCharacter(character.id)}
          type="button"
        >
          <span className="block font-semibold">{character.name}</span>
          <span className="block text-xs text-slate-400">{character.language}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr]">
      <aside className="glass-panel hidden rounded-lg p-4 lg:block">
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

      <section className="glass-panel flex min-h-[40rem] flex-col rounded-lg">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
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
            <Button
              aria-label="Hold to record voice input"
              icon={<Mic size={17} />}
              onPointerDown={startVoiceInput}
              onPointerLeave={stopVoiceInput}
              onPointerUp={stopVoiceInput}
              size="icon"
              variant="ghost"
            >
              Voice input
            </Button>
            <Button
              aria-label="Translate message"
              icon={<Languages size={17} />}
              size="icon"
              variant="ghost"
            >
              Translate message
            </Button>
            <Button
              aria-label="Vocabulary tools"
              icon={<Sparkles size={17} />}
              size="icon"
              variant="ghost"
            >
              Vocabulary tools
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
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
        </div>

        <form className="border-t border-white/10 p-4" onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <textarea
              className="min-h-12 flex-1 resize-none rounded-control border border-white/[0.15] bg-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:focus-ring focus:ring-1 focus:ring-brand-accent"
              disabled={isStreaming}
              onChange={(event) => setInput(event.target.value)}
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
        </form>
      </section>
    </div>
  );
}

function toStringArray(data: object, key: string) {
  return key in data && Array.isArray(data[key as keyof typeof data])
    ? (data[key as keyof typeof data] as unknown[]).filter(
        (item): item is string => typeof item === "string"
      )
    : [];
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

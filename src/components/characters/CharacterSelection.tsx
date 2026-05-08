"use client";

import { MouseEvent, useState } from "react";
import { motion } from "framer-motion";
import { Headphones } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button } from "@/components/ui";
import type { LinguaCharacter } from "@/lib/characters/characters";
import { cn } from "@/lib/utils/cn";

type CharacterSelectionProps = {
  characters: LinguaCharacter[];
};

const themeByCharacter: Record<
  string,
  { glow: string; tone: "blue" | "cyan" | "purple" | "success" | "warning" }
> = {
  carlos: { glow: "shadow-[0_0_34px_rgba(255,209,102,0.3)]", tone: "warning" },
  emma: { glow: "shadow-glow-cyan", tone: "cyan" },
  jake: { glow: "shadow-[0_0_34px_rgba(26,115,232,0.4)]", tone: "blue" },
  kenji: { glow: "shadow-[0_0_34px_rgba(69,245,165,0.28)]", tone: "success" },
  sophie: { glow: "shadow-glow-purple", tone: "purple" }
};

export function CharacterSelection({ characters }: CharacterSelectionProps) {
  const router = useRouter();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? "");

  function handlePointerMove(event: MouseEvent<HTMLElement>) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const rotateX = ((event.clientY - rect.top) / rect.height - 0.5) * -10;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  }

  function resetTilt(event: MouseEvent<HTMLElement>) {
    event.currentTarget.style.transform =
      "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)";
  }

  function startChat() {
    window.localStorage.setItem("linguaai.characterId", selectedId);
    router.push("/chat");
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      {characters.map((character, index) => {
        const theme = themeByCharacter[character.id] ?? themeByCharacter.emma;
        const selected = selectedId === character.id;

        return (
          <motion.article
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "glass-panel flex min-h-[22rem] flex-col rounded-lg p-5 transition duration-200 will-change-transform",
              selected && theme.glow
            )}
            initial={{ opacity: 0, y: 18 }}
            key={character.id}
            onClick={() => setSelectedId(character.id)}
            onMouseLeave={resetTilt}
            onMouseMove={handlePointerMove}
            transition={{ delay: index * 0.07, duration: 0.36, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between">
              <Avatar isActive={selected} name={character.name} size="lg" />
              <Badge tone={theme.tone}>{character.language}</Badge>
            </div>
            <div className="mt-6 flex-1">
              <h2 className="font-display text-xl font-semibold text-white">{character.name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{character.bio}</p>
              <p className="mt-4 text-xs leading-5 text-slate-400">{character.style}</p>
            </div>
            <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
              <Button
                aria-label={`Preview ${character.name}`}
                icon={<Headphones size={16} />}
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewingId(character.id);
                  window.setTimeout(() => setPreviewingId(null), 900);
                }}
                size="icon"
                variant="secondary"
              >
                Preview
              </Button>
              <Button
                onClick={(event) => {
                  event.stopPropagation();

                  if (selected) {
                    startChat();
                  } else {
                    setSelectedId(character.id);
                  }
                }}
                variant={selected ? "primary" : "secondary"}
              >
                {previewingId === character.id ? "Previewing" : selected ? "Start chat" : "Select"}
              </Button>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

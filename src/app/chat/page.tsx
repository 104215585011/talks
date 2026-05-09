import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { AppNav } from "@/components/navigation/AppNav";
import { FluidBackground } from "@/components/ui";
import { listCharacters } from "@/lib/characters/characters";

export default function ChatPage() {
  return (
    <main className="relative h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <FluidBackground
        orbs={[
          { color: "blue", intensity: 0.34 },
          { color: "purple", intensity: 0.28 },
          { color: "cyan", intensity: 0.18 }
        ]}
      />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col gap-5 overflow-hidden">
        <AppNav />
        <ChatWorkspace characters={listCharacters()} />
      </div>
    </main>
  );
}

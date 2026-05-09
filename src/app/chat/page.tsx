import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { AppNav } from "@/components/navigation/AppNav";
import { FluidBackground } from "@/components/ui";
import { listCharacters } from "@/lib/characters/characters";

export default function ChatPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <FluidBackground
        orbs={[
          { color: "blue", intensity: 0.34 },
          { color: "purple", intensity: 0.28 },
          { color: "cyan", intensity: 0.18 }
        ]}
      />
      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        <AppNav />
        <ChatWorkspace characters={listCharacters()} />
      </div>
    </main>
  );
}

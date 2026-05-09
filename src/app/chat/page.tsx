import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { LazyStarfield } from "@/components/effects/LazyStarfield";
import { AppNav } from "@/components/navigation/AppNav";
import { listCharacters } from "@/lib/characters/characters";

export default function ChatPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <LazyStarfield density={520} />
      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        <AppNav />
        <ChatWorkspace characters={listCharacters()} />
      </div>
    </main>
  );
}

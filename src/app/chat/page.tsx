import { ChatWorkspace } from "@/components/chat/ChatWorkspace";
import { LazyStarfield } from "@/components/effects/LazyStarfield";
import { listCharacters } from "@/lib/characters/characters";

export default function ChatPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <LazyStarfield density={520} />
      <ChatWorkspace characters={listCharacters()} />
    </main>
  );
}

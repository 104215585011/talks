import { CharacterSelection } from "@/components/characters/CharacterSelection";
import { AppNav } from "@/components/navigation/AppNav";
import { FluidBackground } from "@/components/ui";
import { listCharacters } from "@/lib/characters/characters";

export default function CharactersPage() {
  const characters = listCharacters();

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <FluidBackground
        orbs={[
          { color: "blue", intensity: 0.78 },
          { color: "purple", intensity: 0.68 },
          { color: "cyan", intensity: 0.5 }
        ]}
      />
      <section className="relative z-10 mx-auto max-w-7xl space-y-8">
        <AppNav />
        <div className="mb-8 max-w-3xl">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-brand-accent">
            Character deck
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-white md:text-6xl">
            Pick the voice you want to practise with.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Each mentor carries a different rhythm, correction style, and cultural context.
          </p>
        </div>
        <CharacterSelection characters={characters} />
      </section>
    </main>
  );
}

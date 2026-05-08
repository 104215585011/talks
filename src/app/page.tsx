import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LazyStarfield } from "@/components/effects/LazyStarfield";

const paths = ["Sign in", "Choose a character", "Stream a conversation"];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <LazyStarfield />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <h1 className="max-w-4xl font-display text-5xl font-semibold leading-tight text-white md:text-7xl">
          LinguaAI
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Practise real conversations with AI mentors who adapt to your language goals and learning
          rhythm.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-control bg-brand-primary px-5 text-base font-semibold text-white shadow-glow transition hover:brightness-110"
            href="/login"
          >
            Enter app <ArrowRight className="transition group-hover:translate-x-0.5" size={17} />
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center rounded-control border border-white/[0.15] bg-white/[0.08] px-5 text-base font-semibold text-slate-100 transition hover:border-brand-accent/50 hover:bg-white/[0.12]"
            href="/characters"
          >
            Browse characters
          </Link>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {paths.map((path) => (
            <div
              className="glass-panel rounded-lg px-4 py-3 text-sm font-medium text-slate-100"
              key={path}
            >
              {path}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

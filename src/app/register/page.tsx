import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { LazyStarfield } from "@/components/effects/LazyStarfield";

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8">
      <LazyStarfield density={400} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-between gap-10">
        <section className="hidden max-w-xl lg:block">
          <Link
            className="font-mono text-sm uppercase tracking-[0.2em] text-brand-purple transition hover:text-white"
            href="/"
          >
            LinguaAI
          </Link>
          <h2 className="mt-5 font-display text-6xl font-semibold leading-tight text-white">
            Choose a voice. Build fluency in motion.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Five tutors, five language worlds, one conversation engine designed for steady practice.
          </p>
        </section>
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <AuthForm mode="register" />
          <p className="mt-5 text-center text-sm text-slate-400">
            Already registered?{" "}
            <Link className="font-semibold text-brand-accent hover:text-white" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

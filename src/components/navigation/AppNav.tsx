"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Button } from "@/components/ui";
import { clearAuthSession, readAuthSession } from "@/lib/auth/client-session";

type AppNavSession = {
  email: string;
  name: string | null;
};

export function AppNav() {
  const router = useRouter();
  const [session, setSession] = useState<AppNavSession | null>(null);

  useEffect(() => {
    const authSession = readAuthSession();

    if (!authSession) {
      router.replace("/login");
      return;
    }

    setSession({
      email: authSession.user.email,
      name: authSession.user.name
    });
  }, [router]);

  const displayName = useMemo(() => session?.name || session?.email || "Learner", [session]);

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <nav className="glass-panel relative z-20 mx-auto flex h-12 w-full max-w-7xl items-center justify-between rounded-lg px-4">
      <Link
        className="font-display text-lg font-semibold text-white transition hover:text-brand-accent"
        href="/characters"
      >
        LinguaAI
      </Link>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar name={displayName} size="sm" />
          <span className="max-w-[14rem] truncate text-sm text-slate-200">
            {session?.email ?? ""}
          </span>
        </div>
        <Button icon={<LogOut size={16} />} onClick={handleLogout} size="sm" variant="ghost">
          Sign out
        </Button>
      </div>
    </nav>
  );
}

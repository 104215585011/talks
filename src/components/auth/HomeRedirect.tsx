"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readAuthSession } from "@/lib/auth/client-session";

export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (readAuthSession()) {
      router.replace("/characters");
    }
  }, [router]);

  return null;
}

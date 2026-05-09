"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui";
import { saveAuthSession } from "@/lib/auth/client-session";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

function validate(mode: AuthMode, email: string, password: string, name: string) {
  if (!email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (mode === "register" && name.trim().length === 0) {
    return "Name is required for registration.";
  }

  return null;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate(mode, email, password, name);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { name } : {})
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      const payload = (await response.json()) as
        | {
            accessToken: string;
            refreshToken: string;
            user: { id: string; email: string; name: string | null };
          }
        | { message?: string; code?: string };

      if (!response.ok || !("accessToken" in payload)) {
        const errorPayload = payload as { code?: string; message?: string };
        setError(errorPayload.message ?? errorPayload.code ?? "Authentication failed.");
        return;
      }

      saveAuthSession(payload);
      router.push("/characters");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <form className="glass-panel w-full max-w-md rounded-lg p-6" onSubmit={handleSubmit}>
      <div className="mb-6">
        <Badge tone={isRegister ? "purple" : "cyan"}>
          {isRegister ? "Create account" : "Sign in"}
        </Badge>
        <h1 className="mt-5 font-display text-3xl font-semibold text-white">
          {isRegister ? "Start your language cockpit" : "Sign in to LinguaAI"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {isRegister
            ? "Create a learner profile and choose your first AI speaking partner."
            : "Continue your character-led conversation practice."}
        </p>
      </div>

      <div className="space-y-4">
        {isRegister ? (
          <Input
            autoComplete="name"
            label="Name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Lovelace"
            value={name}
          />
        ) : null}
        <Input
          autoComplete="email"
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <Input
          autoComplete={isRegister ? "new-password" : "current-password"}
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          type="password"
          value={password}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-control border border-signal-danger/30 bg-signal-danger/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <Button className="mt-6 w-full" isLoading={isLoading} size="lg" type="submit">
        {isLoading
          ? isRegister
            ? "Creating account..."
            : "Signing in..."
          : isRegister
            ? "Create account"
            : "Sign in"}
      </Button>
    </form>
  );
}

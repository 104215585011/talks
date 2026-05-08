const AUTH_STORAGE_KEY = "linguaai.auth";

export type ClientAuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

function isClientAuthSession(value: unknown): value is ClientAuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ClientAuthSession>;

  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    !!candidate.user &&
    typeof candidate.user.id === "string" &&
    typeof candidate.user.email === "string" &&
    (typeof candidate.user.name === "string" || candidate.user.name === null)
  );
}

export function saveAuthSession(session: ClientAuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function readAuthSession() {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isClientAuthSession(parsed)) {
      clearAuthSession();
      return null;
    }

    return parsed;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

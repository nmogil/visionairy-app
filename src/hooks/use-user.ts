import { useCallback, useEffect, useMemo, useState } from "react";

export type AppUser = {
  id: string;
  username?: string;
  signedIn?: boolean; // reserved for future Supabase auth integration
};

const STORAGE_KEY = "aiparty.user";

function safeParse<T>(raw: string | null): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const genId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return `guest_${Math.random().toString(36).slice(2, 10)}`;
};

export default function useUser() {
  const [user, setUser] = useState<AppUser | null>(() => safeParse<AppUser>(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  const ensureGuest = useCallback(() => {
    setUser((prev) => {
      if (prev?.id) return prev;
      return { id: genId(), username: prev?.username } as AppUser;
    });
  }, []);

  const setUsername = useCallback((username: string) => {
    setUser((prev) => {
      const next: AppUser = {
        id: prev?.id || genId(),
        username: username.trim(),
        signedIn: prev?.signedIn,
      };
      return next;
    });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return useMemo(() => ({ user, setUsername, ensureGuest, signOut }), [user, setUsername, ensureGuest, signOut]);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, api, unauthorizedEvent } from "@/lib/api";
import type { Invitation, User } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  pendingInvitationCount: number;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isProtectedPath = ["/dashboard", "/projects", "/invitations"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isProtectedPath);
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(() => {
    return api
      .get<User>("/auth/me")
      .then((currentUser) => {
        setUser(currentUser);
        return api.get<Invitation[]>("/invitations/mine");
      })
      .then((invitations) => setPendingInvitationCount(invitations.length))
      .catch((requestError: unknown) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          setUser(null);
          setPendingInvitationCount(0);
        } else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your account",
          );
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setPendingInvitationCount(0);
      if (!["/login", "/register"].includes(window.location.pathname)) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    };

    if (isProtectedPath) void refreshUser();
    window.addEventListener(unauthorizedEvent, handleUnauthorized);
    return () =>
      window.removeEventListener(unauthorizedEvent, handleUnauthorized);
  }, [isProtectedPath, pathname, refreshUser, router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<User>("/auth/login", { email, password });
    setUser(result);
    setError(null);
    try {
      const invitations = await api.get<Invitation[]>("/invitations/mine");
      setPendingInvitationCount(invitations.length);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to refresh your invitations",
      );
    }
    return result;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await api.post<User>("/auth/register", {
        name,
        email,
        password,
      });
      setUser(result);
      setPendingInvitationCount(0);
      setError(null);
      return result;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.post<void>("/auth/logout");
    setUser(null);
    setPendingInvitationCount(0);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      pendingInvitationCount,
      error,
      login,
      register,
      logout,
      refreshUser,
    }),
    [
      user,
      isLoading,
      pendingInvitationCount,
      error,
      login,
      register,
      logout,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

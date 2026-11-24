import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.me()).user,
    staleTime: Infinity,
    retry: false,
  });

  const onAuthed = (user: User) => {
    // Anything cached under the previous user is stale now.
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    qc.setQueryData(["me"], user);
    return user;
  };

  const loginM = useMutation({ mutationFn: (v: { email: string; password: string }) => api.login(v.email, v.password) });
  const registerM = useMutation({
    mutationFn: (v: { name: string; email: string; password: string }) => api.register(v.name, v.email, v.password),
  });

  const value: AuthState = {
    user: me.data ?? null,
    loading: me.isPending,
    login: async (email, password) => onAuthed((await loginM.mutateAsync({ email, password })).user),
    register: async (name, email, password) => onAuthed((await registerM.mutateAsync({ name, email, password })).user),
    logout: async () => {
      await api.logout();
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      qc.setQueryData(["me"], null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

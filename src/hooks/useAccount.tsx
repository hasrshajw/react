import { createContext, useContext, type ReactNode } from "react";
import { fetchAccount, type AccountUser, type Plan } from "../lib/api";
import { useAsync } from "./useAsync";

interface AccountState { loading: boolean; user: AccountUser | null; plan: Plan | null }

const Ctx = createContext<AccountState>({ loading: true, user: null, plan: null });

/** Loads the signed-in user and their plan once, for the navbar, sidebar, profile menu and plan banner. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useAsync(fetchAccount);
  return <Ctx.Provider value={{ loading, user: data?.user ?? null, plan: data?.plan ?? null }}>{children}</Ctx.Provider>;
}

export const useAccount = () => useContext(Ctx);

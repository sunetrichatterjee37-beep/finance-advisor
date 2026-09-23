import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { viewFn, actionFn } from "../server/api";
export type View = NonNullable<Awaited<ReturnType<typeof viewFn>>["data"]>;
export async function unwrap<T>(
  p: Promise<{ ok: boolean; data: T | null; error: string | null }>,
): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error || "Something went wrong.");
  return r.data as T;
}
type Ctx = {
  view: View;
  refresh: () => Promise<void>;
  act: (type: string, payload: Record<string, any>) => Promise<void>;
  notice: string;
  setNotice: (s: string) => void;
  busy: boolean;
};
const Context = createContext<Ctx | null>(null);
export const useFinance = () => useContext(Context)!;
export function FinanceProvider({
  initial,
  children,
}: {
  initial: View;
  children: ReactNode;
}) {
  const [view, setView] = useState(initial);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setView(await unwrap(viewFn({ data: {} })));
  }, []);
  useEffect(() => {
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  async function act(type: string, payload: Record<string, any>) {
    setBusy(true);
    try {
      await unwrap(actionFn({ data: { type, payload } }));
      await refresh();
      setNotice("Saved. Financial metrics have been refreshed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider value={{ view, refresh, act, notice, setNotice, busy }}>
      {children}
    </Context.Provider>
  );
}

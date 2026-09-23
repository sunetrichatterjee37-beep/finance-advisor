import { useEffect, useState } from "react";
import { unwrap, useFinance } from "./state";
export function useList<T>(
  fetcher: (
    q: any,
  ) => Promise<{ ok: boolean; data: T | null; error: string | null }>,
  query: Record<string, unknown>,
) {
  const { view } = useFinance();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const key = JSON.stringify(query);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    unwrap(fetcher({ data: JSON.parse(key) }))
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [key, view.revision, fetcher]);
  return { data, error, busy };
}

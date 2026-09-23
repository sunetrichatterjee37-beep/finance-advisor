import { useEffect } from "react";
import type { View } from "./state";
/** Read-only capability; financial writes remain explicit human UI actions. */
export function useFinancialContextTool(view: View) {
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = {
      name: "read_financial_summary",
      description:
        "Read the current signed-in company financial summary and its calculated cash horizons. Does not modify records.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input: unknown) {
        if (
          !input ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new Error("Use an empty input object.");
        return {
          company: view.company.name,
          currency: "INR",
          units: "paise",
          as_of: view.metrics.asOf,
          cash: view.metrics.cash,
          payables: view.metrics.payables,
          receivables: view.metrics.receivables,
          projections: view.metrics.projections,
        };
      },
    };
    try {
      Promise.resolve(
        context.registerTool(registration, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [view]);
}

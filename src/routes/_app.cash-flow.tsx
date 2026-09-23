import { createFileRoute } from "@tanstack/react-router";
import { CashFlow } from "../pages/cash-flow";
export const Route = createFileRoute("/_app/cash-flow")({
  component: CashFlow,
});

import { createFileRoute } from "@tanstack/react-router";
import { Budgets } from "../pages/budgets";
export const Route = createFileRoute("/_app/budgets")({ component: Budgets });

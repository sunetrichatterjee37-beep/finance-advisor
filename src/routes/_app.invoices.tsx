import { createFileRoute } from "@tanstack/react-router";
import { Invoices } from "../pages/invoices";
export const Route = createFileRoute("/_app/invoices")({ component: Invoices });

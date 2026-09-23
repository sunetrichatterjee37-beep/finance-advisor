import { createFileRoute } from "@tanstack/react-router";
import { Vendors } from "../pages/vendors";
export const Route = createFileRoute("/_app/vendors")({ component: Vendors });

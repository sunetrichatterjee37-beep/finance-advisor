import { createFileRoute } from "@tanstack/react-router";
import { Advisor } from "../pages/advisor";
export const Route = createFileRoute("/_app/advisor")({ component: Advisor });

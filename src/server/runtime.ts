import { AsyncLocalStorage } from "node:async_hooks";
export type HostedContext = { env: Record<string, any>; user: string };
const runtime = globalThis as typeof globalThis & {
  __financeHostedContext?: AsyncLocalStorage<HostedContext>;
};
export const hostedContext = (runtime.__financeHostedContext ??=
  new AsyncLocalStorage<HostedContext>());
export const hosted = () => hostedContext.getStore();
export const setting = (key: string) => hosted()?.env[key] ?? process.env[key];
export const aiConfigured = () =>
  !!(setting("AI_API_KEY") && setting("AI_BASE_URL") && setting("AI_MODEL"));

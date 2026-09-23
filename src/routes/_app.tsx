import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { viewFn } from "../server/api";
import { FinanceProvider } from "../components/state";
import { Layout } from "../components/layout";
export const Route = createFileRoute("/_app")({
  loader: async () => {
    const r = await viewFn({ data: {} });
    if (!r.ok) throw redirect({ to: "/auth" });
    return r.data;
  },
  component: () => {
    const data = Route.useLoaderData();
    return (
      <FinanceProvider initial={data}>
        <Layout>
          <Outlet />
        </Layout>
      </FinanceProvider>
    );
  },
});

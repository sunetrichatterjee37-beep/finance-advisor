import { createFileRoute } from "@tanstack/react-router";
import { invoiceFn } from "../server/api";
import { unwrap } from "../components/state";
import { InvoiceDetail } from "../pages/invoice-detail";
export const Route = createFileRoute("/_app/invoices_/$id")({
  loader: ({ params }) => unwrap(invoiceFn({ data: params.id })),
  component: () => (
    <InvoiceDetail key={Route.useParams().id} initial={Route.useLoaderData()} />
  ),
});

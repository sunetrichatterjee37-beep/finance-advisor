import { useState } from "react";
import { BookOpen } from "lucide-react";
import { ledgerListFn } from "../server/api";
import { useList } from "../components/use-list";
import { Pagination } from "../components/pagination";
import {
  Title,
  Panel,
  Money,
  Status,
  Empty,
  ErrorText,
} from "../components/ui";
export function LedgerPage() {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [from, setFrom] = useState("");
  const { data, error, busy } = useList(ledgerListFn, {
    page,
    search,
    type,
    from,
  });
  return (
    <>
      <Title
        eyebrow="SOURCE OF TRUTH"
        title="Financial ledger"
        description="Trace invoices, payments and collections to the records behind your numbers."
      />
      <div className="decision-strip">
        <BookOpen size={22} />
        <div>
          <strong>Obligations and cash movements, in one place</strong>
          <p>
            Invoices and receivables establish obligations. Only completed
            payments and receipts change current cash.
          </p>
        </div>
      </div>
      <Panel>
        <div className="filterbar">
          <input
            aria-label="Search ledger"
            placeholder="Search reference or counterparty…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Event type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All event types</option>
            {["INVOICE", "PAYMENT", "RECEIVABLE", "RECEIPT"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            aria-label="Ledger date from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <ErrorText error={error} />
        {busy && (
          <p role="status" className="list-loading">
            Loading records…
          </p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date / type</th>
                <th>Reference</th>
                <th>Vendor / customer</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.date}
                    <small>{r.type}</small>
                  </td>
                  <td>
                    <a className="record-link" href={r.href}>
                      {r.reference}
                    </a>
                    <small>{r.id}</small>
                  </td>
                  <td>{r.party}</td>
                  <td className="num">
                    <Money value={r.amount} />
                  </td>
                  <td>
                    <Status value={r.status} />
                  </td>
                  <td>{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!busy && data?.total === 0 && (
          <Empty text="No events match your filters." />
        )}
        {data && <Pagination {...data} busy={busy} onPage={setPage} />}
      </Panel>
    </>
  );
}

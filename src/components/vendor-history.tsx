import { useState } from "react";
import { vendorHistoryFn } from "../server/api";
import { useList } from "./use-list";
import { Pagination } from "./pagination";
import { Money, ErrorText } from "./ui";
import { money } from "../domain/money";
export function VendorHistory({
  vendor,
}: {
  vendor: {
    id: string;
    history: { id: string; date: string; amount: number }[];
  };
}) {
  const [page, setPage] = useState(0);
  const { data, error, busy } = useList(vendorHistoryFn, {
    id: vendor.id,
    page,
  });
  const points = vendor.history,
    max = Math.max(1, ...points.map((p) => p.amount));
  return (
    <>
      <div className="vendor-trend">
        <span className="source-kicker">
          Invoice amounts · latest {points.length} records
        </span>
        <svg
          viewBox="0 0 600 160"
          role="img"
          aria-label="Historical invoice amounts"
        >
          <line x1="0" y1="140" x2="600" y2="140" stroke="#cbd9e4" />
          {points.map((p, i) => (
            <rect
              key={p.id}
              x={(i * 600) / points.length + 4}
              y={140 - (p.amount / max) * 115}
              width={Math.max(2, 600 / points.length - 8)}
              height={(p.amount / max) * 115}
              fill="#148c83"
              rx="3"
            >
              <title>{p.date + " · " + money(p.amount)}</title>
            </rect>
          ))}
        </svg>
        <p className="muted">
          {points[0]?.date} — {points.at(-1)?.date}
        </p>
      </div>
      <ErrorText error={error} />
      {busy && <p role="status">Loading history…</p>}
      <div className="vendor-timeline">
        {data?.rows.map((i) => (
          <a key={i.id} className="list-row" href={"/invoices/" + i.id}>
            <span>
              {i.date}
              <small>{i.id}</small>
            </span>
            <Money value={i.amount} />
          </a>
        ))}
      </div>
      {data && <Pagination {...data} busy={busy} onPage={setPage} />}
    </>
  );
}

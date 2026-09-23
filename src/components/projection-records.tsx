import { projectionListFn } from "../server/api";
import { useList } from "./use-list";
import { Pagination } from "./pagination";
import { useEffect, useState } from "react";
import { Money, Panel, ErrorText, Empty } from "./ui";
export function ProjectionRecords({
  days,
  kind,
}: {
  days: number;
  kind: "payables" | "receivables";
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [days]);
  const { data, error, busy } = useList(projectionListFn, { days, kind, page });
  return (
    <Panel title={"Supporting " + kind}>
      <ErrorText error={error} />
      {busy && <p role="status">Loading supporting records…</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Expected date</th>
              <th className="num">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {kind === "payables" ? (
                    <a className="record-link" href={"/invoices/" + r.id}>
                      {r.reference}
                    </a>
                  ) : (
                    r.reference
                  )}
                </td>
                <td>{r.due_date}</td>
                <td className="num">
                  <Money value={r.amount} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!busy && data?.total === 0 && (
        <Empty text="No outstanding records in this horizon." />
      )}
      {data && <Pagination {...data} busy={busy} onPage={setPage} />}
    </Panel>
  );
}

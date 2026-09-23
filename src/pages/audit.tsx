import { auditListFn } from "../server/api";
import { useList } from "../components/use-list";
import { Pagination } from "../components/pagination";
import { useState } from "react";
import { useFinance } from "../components/state";
import { Title, Panel, Status, Empty, ErrorText } from "../components/ui";
export function Audit() {
  const { view } = useFinance();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data, error, busy } = useList(auditListFn, { page, search });
  if (view.actor.role !== "admin")
    return (
      <Empty text="Administrator access is required to view the full audit trail." />
    );
  const logs = data?.rows || [];
  return (
    <>
      <Title
        eyebrow="ACCOUNTABILITY"
        title="Audit trail"
        description="A record of who changed what, when, and why."
      />
      <Panel>
        <div className="filterbar">
          <input
            aria-label="Search audit events"
            placeholder="Search action, record or user…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <span className="muted">Complete action history</span>
        </div>
        <ErrorText error={error} />
        {busy && (
          <p role="status" className="list-loading">
            Loading audit events…
          </p>
        )}
        {logs.map((a) => (
          <details className="audit-row" key={a.id}>
            <summary>
              <span className="audit-dot" />
              <span>
                <strong>{a.action.replaceAll("_", " ")}</strong>
                <small>
                  {(a.metadata as any)?.actor_name || a.user_id} ·{" "}
                  {a.entity_type} · {a.entity_id}
                </small>
              </span>
              <time>{new Date(a.created_at).toLocaleString("en-IN")}</time>
            </summary>
            <div className="audit-states">
              <div>
                <h3>Previous state</h3>
                <pre>{JSON.stringify(a.previous_state, null, 2)}</pre>
              </div>
              <div>
                <h3>New state</h3>
                <pre>{JSON.stringify(a.new_state, null, 2)}</pre>
              </div>
            </div>
            <p>
              Reason:{" "}
              {(a.metadata as any)?.reason || "Recorded by authenticated user"}
            </p>
          </details>
        ))}
        {!busy && !logs.length && (
          <Empty text="No matching events. Create or review a record to begin the audit trail." />
        )}
        {data && <Pagination {...data} busy={busy} onPage={setPage} />}
      </Panel>
    </>
  );
}

import { riskListFn } from "../server/api";
import { useList } from "../components/use-list";
import { Pagination } from "../components/pagination";
import { useState } from "react";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { useFinance } from "../components/state";
import { Title, Panel, Status, Empty, ErrorText } from "../components/ui";
export function RiskCenter() {
  const { view, act, busy } = useFinance();
  const [severity, setSeverity] = useState("ALL");
  const [type, setType] = useState("");
  const [vendor, setVendor] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [page, setPage] = useState(0);
  const listing = useList(riskListFn, {
    page,
    severity,
    type,
    vendor,
    status,
    from,
    minAmount: Number(minAmount) * 100,
  });
  const items = listing.data?.rows || [];
  async function change(id: string, status: string) {
    try {
      await act("recommendation", { id, status });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Title
        eyebrow="REVIEW & INVESTIGATE"
        title="Risk center"
        description="Explainable signals. Supporting evidence. Human decisions."
      />
      <div className="risk-summary">
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
          <button
            key={s}
            className={severity === s ? "selected" : ""}
            onClick={() => {
              setSeverity(s);
              setPage(0);
            }}
          >
            <span>{s === "ALL" ? "All signals" : s.toLowerCase()}</span>
            <strong>
              {s === "ALL"
                ? view.risk_count
                : view.risk_counts[s as keyof typeof view.risk_counts]}
            </strong>
          </button>
        ))}
      </div>
      <div className="filterbar standalone">
        <select
          aria-label="Filter risk type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All risk types</option>
          {[
            "DUPLICATE",
            "AMOUNT",
            "FREQUENCY",
            "OVERDUE",
            "BUDGET",
            "DATA_QUALITY",
            "RECONCILIATION",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Filter risk vendor"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
        >
          <option value="">All vendors</option>
          {view.vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Review status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All review statuses</option>
          {[
            "PENDING_REVIEW",
            "APPROVED",
            "INVESTIGATION",
            "SCHEDULED",
            "PAID",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Invoice date from"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          type="number"
          min="0"
          aria-label="Minimum invoice amount in rupees"
          placeholder="Minimum amount (₹)"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
        <span className="muted">Signals do not establish fraud.</span>
      </div>
      <ErrorText error={listing.error} />
      {listing.busy && (
        <p role="status" className="list-loading">
          Loading signals…
        </p>
      )}
      <div className="risk-list">
        {items.map((r) => {
          const i = view.invoices.find((i) => i.id === r.invoice_id);
          return (
            <Panel key={r.invoice_id}>
              <div className="risk-card-head">
                <span className="risk-icon">
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h2>{r.invoice_number}</h2>
                  <p>{r.vendor_name}</p>
                </div>
                <Status value={r.severity} />
                <a className="secondary" href={"/invoices/" + r.invoice_id}>
                  Review invoice <ArrowUpRight size={15} />
                </a>
              </div>
              <div className="signal-chips">
                {r.signals.map((s, k) => (
                  <span key={k}>{s.title}</span>
                ))}
              </div>
              <details className="evidence">
                <summary>{r.signals.length} signals · View evidence</summary>
                {r.signals.map((s, k) => (
                  <div className="signal-detail" key={k}>
                    <strong>{s.title}</strong>
                    <p>{s.reason}</p>
                    <code>{s.calculation}</code>
                    <small>
                      Source records:{" "}
                      {[...new Set(s.source_records)].join(", ")}
                    </small>
                  </div>
                ))}
              </details>
            </Panel>
          );
        })}
      </div>
      {listing.data && (
        <Pagination {...listing.data} busy={listing.busy} onPage={setPage} />
      )}
      {!listing.busy && !items.length && (
        <Empty text="No risk signals match your filters." />
      )}
      <Title
        title="Recommended actions"
        description="Generated from documented rules and current financial conditions."
      />
      <ErrorText error={error} />
      <Panel>
        {view.recommendations.map((r) => (
          <div className="recommendation-full" key={r.id}>
            <div>
              <Status value={r.priority} />
              <h3>{r.title}</h3>
              <p>{r.reason}</p>
              <small className="muted">
                Evidence: {[...new Set(r.source_records)].join(", ")}
              </small>
            </div>
            <div>
              <Status value={r.status} />
              {view.actor.role !== "viewer" && (
                <div className="actions">
                  {r.status === "OPEN" && (
                    <button
                      disabled={busy}
                      onClick={() => change(r.id, "REVIEWED")}
                    >
                      Mark reviewed
                    </button>
                  )}
                  {r.status === "REVIEWED" && (
                    <button
                      disabled={busy}
                      onClick={() => change(r.id, "ACCEPTED")}
                    >
                      Accept
                    </button>
                  )}
                  {r.status === "ACCEPTED" && (
                    <button
                      disabled={busy}
                      onClick={() => change(r.id, "COMPLETED")}
                    >
                      Complete
                    </button>
                  )}
                  {!["COMPLETED", "DISMISSED"].includes(r.status) && (
                    <button
                      disabled={busy}
                      onClick={() => change(r.id, "DISMISSED")}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {!view.recommendations.length && (
          <Empty text="No recommendations are currently triggered." />
        )}
      </Panel>
    </>
  );
}

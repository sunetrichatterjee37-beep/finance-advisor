import { ProjectionRecords } from "../components/projection-records";
import { receivablesListFn } from "../server/api";
import { useList } from "../components/use-list";
import { Pagination } from "../components/pagination";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinance } from "../components/state";
import { Panel, Title, Money, Modal, Field, ErrorText } from "../components/ui";
import { CashChart } from "../components/charts";
import { minor, today, addDays } from "../domain/money";
export function CashFlow() {
  const { view, act, busy } = useFinance();
  const m = view.metrics;
  const [days, setDays] = useState(30);
  const p = m.projections.find((p) => p.days === days)!;
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [receivablePage, setReceivablePage] = useState(0);
  const receivableList = useList(receivablesListFn, { page: receivablePage });
  const can = view.actor.role !== "viewer";
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      if (modal === "new")
        await act("receivable", {
          customer_name: f.get("customer"),
          reference_number: f.get("reference"),
          issue_date: f.get("date"),
          due_date: f.get("due"),
          amount_minor: minor(String(f.get("amount"))),
          currency_code: "INR",
        });
      else
        await act("receipt", {
          id: modal,
          amount_minor: minor(String(f.get("amount"))),
          reference: f.get("reference"),
          date: f.get("date"),
        });
      setModal("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Title
        eyebrow="LIQUIDITY & PLANNING"
        title="Cash flow"
        description="A transparent projection of dated collections and obligations."
        action={
          can && (
            <button className="primary" onClick={() => setModal("new")}>
              <Plus size={16} />
              Add receivable
            </button>
          )
        }
      />
      <div className="summary-strip">
        <span>
          Current cash <Money value={m.cash} />
        </span>
        <span>
          Payables <Money value={m.payables} />
        </span>
        <span>
          Receivables <Money value={m.receivables} />
        </span>
        <span>
          Net position <Money value={m.net} />
        </span>
      </div>
      <div className="overview-grid">
        <Panel
          title="Cash projection"
          meta={<span className="muted">Select a horizon</span>}
        >
          <CashChart
            points={m.projections}
            onSelect={setDays}
            selected={days}
          />
        </Panel>
        <Panel title={days ? "The next " + days + " days" : "Current cash"}>
          <dl className="detail-list">
            <div>
              <dt>Current cash</dt>
              <dd>
                <Money value={m.cash} />
              </dd>
            </div>
            <div>
              <dt>Expected inflow</dt>
              <dd>
                + <Money value={p.inflow} />
              </dd>
            </div>
            <div>
              <dt>Expected outflow</dt>
              <dd>
                − <Money value={p.outflow} />
              </dd>
            </div>
            <div className="total">
              <dt>Projected cash</dt>
              <dd>
                <Money value={p.cash} />
              </dd>
            </div>
          </dl>
          <p className="muted">
            Overdue balances are included in the next horizon. Collection timing
            may change; this is not an AI forecast.
          </p>
        </Panel>
      </div>
      <div className="overview-grid">
        <ProjectionRecords days={days} kind="payables" />
        <ProjectionRecords days={days} kind="receivables" />
      </div>
      <Panel title="Receivables ledger">
        <ErrorText error={receivableList.error} />
        {receivableList.busy && <p role="status">Loading receivables…</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer / reference</th>
                <th>Due date</th>
                <th className="num">Amount</th>
                <th className="num">Received</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {receivableList.data?.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.customer_name}</strong>
                    <small>{r.reference_number}</small>
                  </td>
                  <td>{r.due_date}</td>
                  <td className="num">
                    <Money value={r.amount_minor} />
                  </td>
                  <td className="num">
                    <Money value={r.received_minor} />
                  </td>
                  <td>
                    {can && r.amount_minor > r.received_minor && (
                      <button
                        className="secondary"
                        onClick={() => setModal(r.id)}
                      >
                        Record receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {receivableList.data && (
          <Pagination
            {...receivableList.data}
            busy={receivableList.busy}
            onPage={setReceivablePage}
          />
        )}
      </Panel>
      <div className="decision-strip">
        <div>
          <strong>Trace every recorded movement</strong>
          <p>
            Browse the complete invoice, payment, receivable and receipt
            history.
          </p>
        </div>
        <a href="/ledger">Open financial ledger →</a>
      </div>
      {modal && (
        <Modal
          title={modal === "new" ? "Add receivable" : "Record receipt"}
          onClose={() => setModal("")}
        >
          <form onSubmit={save}>
            {modal === "new" && (
              <>
                <Field label="Customer">
                  <input name="customer" required />
                </Field>
                <Field label="Due date">
                  <input
                    name="due"
                    type="date"
                    required
                    defaultValue={addDays(today(), 30)}
                  />
                </Field>
              </>
            )}
            <Field label={modal === "new" ? "Issue date" : "Receipt date"}>
              <input name="date" type="date" required defaultValue={today()} />
            </Field>
            <Field label="Unique reference">
              <input name="reference" required />
            </Field>
            <Field label="Amount (₹)">
              <input name="amount" inputMode="decimal" required />
            </Field>
            <ErrorText error={error} />
            <button disabled={busy} className="primary">
              Save {modal === "new" ? "receivable" : "receipt"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

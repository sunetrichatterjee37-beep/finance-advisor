import { useState } from "react";
import { useFinance, unwrap } from "../components/state";
import { invoiceFn, documentFn } from "../server/api";
import {
  Title,
  Panel,
  Status,
  Money,
  Field,
  ErrorText,
  Modal,
} from "../components/ui";
import { minor, today } from "../domain/money";
type Detail = NonNullable<Awaited<ReturnType<typeof invoiceFn>>["data"]>;
export function InvoiceDetail({ initial }: { initial: Detail }) {
  const { view, act, busy } = useFinance();
  const [data, setData] = useState(initial);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState("");
  const i = data.invoice;
  const paid = data.payments.reduce((s, p) => s + p.amount_minor, 0);
  async function action(type: string, payload: Record<string, any>) {
    setError("");
    try {
      await act(type, payload);
      setData(await unwrap(invoiceFn({ data: i.id })));
      setModal("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function payment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget);
      await action("payment", {
        invoice_id: i.id,
        amount_minor: minor(String(f.get("amount"))),
        payment_date: f.get("date"),
        reference: f.get("reference"),
        currency_code: "INR",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <a href="/invoices" className="back-link">
        ← All invoices
      </a>
      <Title
        eyebrow="INVOICE DETAILS"
        title={i.invoice_number}
        description={`${data.vendor?.name} · ${i.description}`}
        action={<Status value={i.status} />}
      />
      <ErrorText error={error} />
      <div className="detail-grid">
        <div>
          <Panel title="Invoice information">
            <dl className="detail-list">
              <div>
                <dt>Vendor</dt>
                <dd>{data.vendor?.name}</dd>
              </div>
              <div>
                <dt>Invoice date</dt>
                <dd>{i.invoice_date}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{i.due_date}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>
                  <Money value={i.subtotal_minor} />
                </dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>
                  <Money value={i.tax_minor} />
                </dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>
                  <Money value={i.total_minor} />
                </dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>
                  <Money value={paid} />
                </dd>
              </div>
              <div>
                <dt>Outstanding</dt>
                <dd>
                  <Money value={Math.max(0, i.total_minor - paid)} />
                </dd>
              </div>
            </dl>
            {i.file_id && (
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    const d = await unwrap(documentFn({ data: i.file_id! }));
                    if (d.url.startsWith("data:")) {
                      const blob = await (await fetch(d.url)).blob();
                      window.open(
                        URL.createObjectURL(blob),
                        "_blank",
                        "noopener",
                      );
                    } else window.open(d.url, "_blank", "noopener");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Open source document
              </button>
            )}
          </Panel>
          <Panel title="Risk signals & evidence">
            {data.risk?.signals.map((s, k) => (
              <details className="evidence" key={k} open={k === 0}>
                <summary>
                  <Status value={s.severity} />
                  <strong>{s.title}</strong>
                </summary>
                <p>{s.reason}</p>
                <div className="calculation">{s.calculation}</div>
                <dl className="evidence-inputs">
                  {Object.entries(s.input_values).map(([key, v]) => (
                    <div key={key}>
                      <dt>{key.replaceAll("_", " ")}</dt>
                      <dd>
                        {key.endsWith("_minor") ? (
                          <Money value={Number(v)} />
                        ) : (
                          String(v)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="source-links">
                  {[...new Set(s.source_records)].map((id) => (
                    <a
                      key={id}
                      href={id.startsWith("b") ? "/budgets" : "/invoices/" + id}
                    >
                      {id}
                    </a>
                  ))}
                </div>
                <small className="muted">
                  Calculated {new Date(s.timestamp).toLocaleString()}
                </small>
              </details>
            )) || <p>No current risk signals.</p>}
          </Panel>
        </div>
        <div>
          <Panel title="Review & decision">
            {view.actor.role === "viewer" ? (
              <p>You have read-only access.</p>
            ) : (
              <>
                <p className="muted">
                  Review the source document and evidence before deciding.
                </p>
                {["PDF", "IMAGE"].includes(i.source) && !i.confirmed_at && (
                  <button
                    className="secondary full"
                    disabled={busy}
                    onClick={() => action("confirm", { id: i.id })}
                  >
                    I confirm the extracted fields
                  </button>
                )}
                <Field label="Review reason">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="What did you verify?"
                  />
                </Field>
                <div className="decision-buttons">
                  <button
                    disabled={
                      busy ||
                      !reason ||
                      !["PENDING_REVIEW", "INVESTIGATION"].includes(i.status)
                    }
                    className="primary"
                    onClick={() =>
                      action("decision", {
                        id: i.id,
                        status: "APPROVED",
                        reason,
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    disabled={busy || !reason || i.status === "PAID"}
                    className="secondary"
                    onClick={() =>
                      action("decision", {
                        id: i.id,
                        status: "INVESTIGATION",
                        reason,
                      })
                    }
                  >
                    Investigate
                  </button>
                  <button
                    disabled={
                      busy || !reason || i.status === "PAID" || paid > 0
                    }
                    className="danger"
                    onClick={() => setModal("reject")}
                  >
                    Reject
                  </button>
                </div>
                {["APPROVED", "SCHEDULED"].includes(i.status) && (
                  <div className="payment-actions">
                    <button
                      className="secondary full"
                      onClick={() => setModal("payment")}
                    >
                      Record payment
                    </button>
                    <button
                      className="secondary full"
                      onClick={() => setModal("schedule")}
                    >
                      Schedule payment
                    </button>
                  </div>
                )}
              </>
            )}
            <a className="text-link" href={"/advisor?invoice=" + i.id}>
              Ask about this invoice →
            </a>
          </Panel>
          <Panel title="Payment history">
            {data.payments.length ? (
              data.payments.map((p) => (
                <div className="list-row" key={p.id}>
                  <div>
                    <strong>{p.reference}</strong>
                    <small>{p.payment_date}</small>
                  </div>
                  <Money value={p.amount_minor} />
                </div>
              ))
            ) : (
              <p className="muted">No payments recorded.</p>
            )}
          </Panel>
          <Panel title="Activity">
            {data.audit.length ? (
              data.audit.map((a) => (
                <div className="audit-mini" key={a.id}>
                  <strong>{a.action.replaceAll("_", " ")}</strong>
                  <small>{new Date(a.created_at).toLocaleString()}</small>
                </div>
              ))
            ) : (
              <p className="muted">No review activity yet.</p>
            )}
          </Panel>
        </div>
      </div>
      {modal && (
        <Modal
          title={
            modal === "payment"
              ? "Record completed payment"
              : modal === "schedule"
                ? "Schedule payment"
                : "Reject invoice"
          }
          onClose={() => setModal("")}
        >
          <ErrorText error={error} />
          {modal === "payment" ? (
            <form onSubmit={payment}>
              <Field label="Amount paid (₹)">
                <input
                  name="amount"
                  required
                  defaultValue={(i.total_minor - paid) / 100}
                />
              </Field>
              <Field label="Payment date">
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={today()}
                  max={today()}
                />
              </Field>
              <Field label="Unique bank/payment reference">
                <input name="reference" required />
              </Field>
              <p className="muted">
                This records an existing payment. It does not move money.
              </p>
              <button className="primary" disabled={busy}>
                Record payment
              </button>
            </form>
          ) : modal === "schedule" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action("schedule", {
                  id: i.id,
                  date: new FormData(e.currentTarget).get("date"),
                });
              }}
            >
              <Field label="Scheduled date">
                <input type="date" name="date" min={today()} required />
              </Field>
              <button className="primary" disabled={busy}>
                Save schedule
              </button>
            </form>
          ) : (
            <>
              <p>
                Reject {i.invoice_number}? The decision and reason will be saved
                to the audit trail.
              </p>
              <button
                className="danger"
                disabled={busy}
                onClick={() =>
                  action("decision", { id: i.id, status: "REJECTED", reason })
                }
              >
                Confirm rejection
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

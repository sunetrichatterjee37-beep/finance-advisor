import { useState, useEffect } from "react";
import { Sparkles, ArrowUp, ShieldCheck } from "lucide-react";
import { useFinance, unwrap } from "../components/state";
import { advisorFn } from "../server/api";
import { Title, Panel, Money, ErrorText } from "../components/ui";
type Answer = NonNullable<Awaited<ReturnType<typeof advisorFn>>["data"]>;
export function Advisor() {
  const { view } = useFinance();
  const [question, setQuestion] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [chat, setChat] = useState<{ q: string; a: Answer }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () =>
      setInvoiceId(
        new URLSearchParams(window.location.search).get("invoice") || "",
      ),
    [],
  );
  async function ask(q = question) {
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    try {
      const a = await unwrap(
        advisorFn({
          data: { question: q, ...(invoiceId ? { invoiceId } : {}) },
        }),
      );
      setChat((c) => [...c, { q, a }]);
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title
        eyebrow="EXPLAINABLE FINANCIAL INTELLIGENCE"
        title="AI advisor"
        description="Ask a question. Follow the calculation. Inspect the evidence."
      />
      <div className="advisor-layout">
        <div className="advisor-main">
          <div className="advisor-status">
            <ShieldCheck size={17} />
            {view.ai_connected
              ? "Connected to verified financial context"
              : "Verified explanations · AI connection pending"}
          </div>
          {invoiceId && (
            <div className="notice">
              Focused on invoice {invoiceId}.{" "}
              <button className="text-button" onClick={() => setInvoiceId("")}>
                Clear focus
              </button>
            </div>
          )}
          {!chat.length && (
            <div className="advisor-welcome">
              <span className="advisor-orb">
                <Sparkles size={28} />
              </span>
              <h2>What would you like to understand?</h2>
              <p>
                Your ledger provides the numbers.
                <br />
                The advisor helps explain what they mean.
              </p>
              <div className="question-grid">
                {[
                  "Why is projected cash changing?",
                  "Which invoices are overdue?",
                  "Which category is closest to its budget limit?",
                  "What are the major financial risks?",
                ].map((q) => (
                  <button disabled={busy} key={q} onClick={() => ask(q)}>
                    {q}
                    <ArrowUp size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {chat.map((item, k) => (
            <div className="conversation" key={k}>
              <div className="user-question">{item.q}</div>
              <div className="advisor-answer">
                <span className="answer-label">
                  <Sparkles size={16} />
                  {item.a.mode}
                </span>
                <p>{item.a.explanation}</p>
                {item.a.intent === "budget" &&
                  item.a.budget_details.map((b) => (
                    <div className="answer-evidence-card" key={b.id}>
                      <span className="source-kicker">Budget calculation</span>
                      <h3>{b.name}</h3>
                      <p>
                        Budget <Money value={b.budget_minor} /> − paid{" "}
                        <Money value={b.actual} /> − committed{" "}
                        <Money value={b.committed} /> ={" "}
                        <strong>
                          <Money value={b.remaining} />
                        </strong>{" "}
                        remaining
                      </p>
                      <small>
                        Source: {b.id} ·{" "}
                        {b.source_records.join(", ") ||
                          "No approved invoices in this period"}
                      </small>
                    </div>
                  ))}
                {(item.a.intent === "risk" || item.a.intent === "invoice") &&
                  item.a.risks.slice(0, 12).map((r) => (
                    <details
                      className="answer-evidence-card"
                      key={r.invoice_id}
                    >
                      <summary>
                        {r.invoice_id} · {r.severity} · {r.signals.length}{" "}
                        signals
                      </summary>
                      {r.signals.map((s, k) => (
                        <div className="signal-detail" key={k}>
                          <strong>{s.title}</strong>
                          <p>{s.reason}</p>
                          <code>{s.calculation}</code>
                          <small>Sources: {s.source_records.join(", ")}</small>
                          <small>
                            Calculated:{" "}
                            {new Date(s.timestamp).toLocaleString("en-IN")}
                          </small>
                        </div>
                      ))}
                    </details>
                  ))}
                {(item.a.intent === "cash" || item.a.scenario) && (
                  <details className="evidence" open>
                    <summary>
                      View calculation · {item.a.horizon}-day cash outlook
                    </summary>
                    <dl className="detail-list">
                      <div>
                        <dt>Current cash</dt>
                        <dd>
                          <Money value={item.a.calculation.current} />
                        </dd>
                      </div>
                      <div>
                        <dt>Expected receipts</dt>
                        <dd>
                          + <Money value={item.a.calculation.inflow} />
                        </dd>
                      </div>
                      <div>
                        <dt>Expected payments</dt>
                        <dd>
                          − <Money value={item.a.calculation.outflow} />
                        </dd>
                      </div>
                      <div className="total">
                        <dt>Projected cash</dt>
                        <dd>
                          <Money value={item.a.calculation.projected} />
                        </dd>
                      </div>
                    </dl>
                    <div className="calculation-sources">
                      <span className="source-kicker">
                        Supporting obligations
                      </span>
                      {item.a.calculation_sources.map((r) => (
                        <a key={r.id} className="list-row" href={r.href}>
                          <span>
                            {r.reference}
                            <small>
                              {r.type} · {r.due_date}
                            </small>
                          </span>
                          <Money value={r.amount} />
                        </a>
                      ))}
                    </div>
                  </details>
                )}
                {item.a.scenario && (
                  <p>
                    Cash after immediate payment of the selected invoice:{" "}
                    <Money value={item.a.scenario.cash_after_payment} />
                    <small>
                      Calculation: <Money value={item.a.scenario.cash_before} />{" "}
                      − outstanding{" "}
                      <Money value={item.a.scenario.outstanding} /> · Source:{" "}
                      {item.a.scenario.invoice_id}
                    </small>
                    <small className="muted">{item.a.scenario.note}</small>
                  </p>
                )}
                <div className="source-links">
                  {item.a.source_links.map((s) => (
                    <a key={s.id} href={s.href}>
                      {s.id}
                    </a>
                  ))}
                </div>
                <p className="advisor-disclaimer">{item.a.notice}</p>
              </div>
            </div>
          ))}
          {busy && (
            <p role="status" className="loading-line">
              Reading the verified ledger…
            </p>
          )}
          <ErrorText error={error} />
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <textarea
              aria-label="Ask a financial question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={2000}
              placeholder="Ask about cash flow, budgets, or an invoice…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
            <button
              className="primary"
              disabled={busy || !question.trim()}
              aria-label="Send question"
            >
              <ArrowUp size={20} />
            </button>
          </form>
          <p className="chat-footnote">
            The advisor cannot approve invoices, transfer money, or change your
            records.
          </p>
        </div>
        <aside>
          <Panel title="Financial context">
            <dl className="detail-list">
              <div>
                <dt>Current cash</dt>
                <dd>
                  <Money value={view.metrics.cash} />
                </dd>
              </div>
              <div>
                <dt>Open payables</dt>
                <dd>
                  <Money value={view.metrics.payables} />
                </dd>
              </div>
              <div>
                <dt>Expected receipts</dt>
                <dd>
                  <Money value={view.metrics.receivables} />
                </dd>
              </div>
            </dl>
            <p className="muted">
              One ledger. One calculation engine. Evidence behind every answer.
            </p>
          </Panel>
        </aside>
      </div>
    </>
  );
}

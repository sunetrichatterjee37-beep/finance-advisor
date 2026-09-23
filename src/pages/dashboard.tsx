import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Plus,
  ArrowDownRight,
  CheckCheck,
} from "lucide-react";
import { useFinance } from "../components/state";
import {
  Panel,
  Title,
  Money,
  Status,
  LinkArrow,
  Empty,
} from "../components/ui";
import { CashChart, BudgetBar } from "../components/charts";
import { money } from "../domain/money";
export function Dashboard() {
  const { view } = useFinance();
  const m = view.metrics;
  const p = m.projections[1];
  const serious = view.risks.filter((r) =>
    ["HIGH", "CRITICAL"].includes(r.severity),
  );
  return (
    <>
      <Title
        eyebrow="FINANCIAL OVERVIEW"
        title="Financial overview"
        description={`${view.company.name} · ${new Date(m.asOf + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
        action={
          view.actor.role !== "viewer" && (
            <a className="primary" href="/invoices?new=1">
              <Plus size={17} /> Add invoice
            </a>
          )
        }
      />
      <div className="decision-strip">
        <ShieldAlert size={22} />
        <div>
          <strong>
            {view.risk_counts.HIGH + view.risk_counts.CRITICAL} invoices need
            priority review
          </strong>
          <p>
            Review the evidence before approval. Your 30-day outlook includes
            dated outstanding obligations.
          </p>
        </div>
        <a href="/risk">
          Review signals <ArrowRight size={16} />
        </a>
      </div>
      <div className="kpi-grid">
        <section className="cash-kpi">
          <div className="kpi-label">
            Current cash <Wallet size={19} />
          </div>
          <strong>{money(m.cash)}</strong>
          <div className="cash-caption">
            <span>Cash coverage</span>
            <b>
              {m.coverage === null
                ? "No upcoming payables"
                : m.coverage.toFixed(2) + "×"}
            </b>
          </div>
        </section>
        <section className="kpi">
          <div className="kpi-label">
            Outstanding payables <ArrowUpRight size={18} />
          </div>
          <strong>{money(m.payables)}</strong>
          <span className="kpi-foot">
            <span className="amber-text">{money(m.overdue_payables)}</span>{" "}
            overdue
          </span>
        </section>
        <section className="kpi">
          <div className="kpi-label">
            Expected receivables <ArrowDownLeft size={18} />
          </div>
          <strong>{money(m.receivables)}</strong>
          <span className="kpi-foot">Across open customer invoices</span>
        </section>
        <section className="kpi">
          <div className="kpi-label">
            Budget utilization <CheckCheck size={18} />
          </div>
          <strong>
            {m.budget_utilization.toFixed(1)}
            <small>%</small>
          </strong>
          <span className="kpi-foot">Actual + approved commitments</span>
        </section>
      </div>
      <div className="overview-grid">
        <Panel
          title="Cash outlook"
          meta={<LinkArrow href="/cash-flow">View cash flow</LinkArrow>}
        >
          <div className="chart-summary">
            <div>
              <span className="muted">Projected in 30 days</span>
              <h2>{money(p.cash)}</h2>
            </div>
            <span className={"trend " + (p.cash < m.cash ? "down" : "up")}>
              {p.cash < m.cash ? (
                <ArrowDownRight size={16} />
              ) : (
                <ArrowUpRight size={16} />
              )}{" "}
              {money(Math.abs(p.cash - m.cash))}{" "}
              {p.cash < m.cash ? "decrease" : "increase"}
            </span>
          </div>
          <CashChart points={m.projections} />
          <div className="cash-bridge">
            <div>
              <span>Current cash</span>
              <strong>{money(m.cash)}</strong>
            </div>
            <div>
              <span>Expected inflow</span>
              <strong className="inflow">+ {money(p.inflow)}</strong>
            </div>
            <div>
              <span>Expected outflow</span>
              <strong className="outflow">− {money(p.outflow)}</strong>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="dot teal" />
              Dated cash projection
            </span>
            <span>Assumes collection and payment on due dates</span>
          </div>
        </Panel>
        <Panel
          title="Needs your attention"
          meta={<span className="count-pill">{serious.length}</span>}
          className="attention-panel"
        >
          <p className="panel-intro">
            Prioritize the signals that need a closer look.
          </p>
          {serious.slice(0, 3).map((r) => (
            <a
              className="attention-row"
              key={r.invoice_id}
              href={"/invoices/" + r.invoice_id}
            >
              <span className="risk-icon">
                <ShieldAlert size={18} />
              </span>
              <div>
                <strong>
                  {
                    r.signals.find(
                      (s) => s.severity === "HIGH" || s.severity === "CRITICAL",
                    )?.title
                  }
                </strong>
                <p>
                  {view.invoices.find((i) => i.id === r.invoice_id)
                    ?.invoice_number || r.invoice_id}
                </p>
                <small>{r.signals.length} signals · Evidence available</small>
              </div>
              <ArrowUpRight size={17} />
            </a>
          ))}
          {!serious.length && <Empty text="No high-priority signals." />}
          <a className="panel-bottom-link" href="/risk">
            Open risk center <ArrowRight size={16} />
          </a>
        </Panel>
      </div>
      <div className="overview-grid lower">
        <Panel
          title="Budget overview"
          meta={<LinkArrow href="/budgets">Manage budgets</LinkArrow>}
        >
          <div className="budget-legend">
            <span>
              <i className="dot teal" /> Actual
            </span>
            <span>
              <i className="dot light-teal" /> Committed
            </span>
            <span>
              <i className="dot gray" /> Remaining
            </span>
          </div>
          {m.budgets
            .filter((b) => b.period_start <= m.asOf && b.period_end >= m.asOf)
            .map((b) => (
              <div className="budget-overview" key={b.id}>
                <div>
                  <strong>{b.name}</strong>
                  <span>
                    {money(b.actual + b.committed)}{" "}
                    <small>/ {money(b.budget_minor)}</small>
                  </span>
                </div>
                <BudgetBar
                  actual={b.actual}
                  committed={b.committed}
                  budget={b.budget_minor}
                />
                <div className="budget-meta">
                  <span>{money(b.remaining)} remaining</span>
                  <b>{b.utilization.toFixed(0)}%</b>
                </div>
              </div>
            ))}
        </Panel>
        <Panel
          title="Recommended actions"
          meta={<span className="muted">Rule-based</span>}
        >
          {view.recommendations
            .filter((r) => !["DISMISSED", "COMPLETED"].includes(r.status))
            .slice(0, 3)
            .map((r, k) => (
              <a className="recommendation-row" href="/risk" key={r.id}>
                <span className="step-number">0{k + 1}</span>
                <div>
                  <strong>{r.title}</strong>
                  <p>{r.reason}</p>
                </div>
                <ArrowUpRight size={17} />
              </a>
            ))}
          {!view.recommendations.length && (
            <Empty text="No recommendations at this time." />
          )}
        </Panel>
      </div>
      <Panel
        title="Upcoming obligations"
        meta={<LinkArrow href="/invoices">All invoices</LinkArrow>}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Vendor</th>
                <th>Due date</th>
                <th>Status</th>
                <th className="num">Outstanding</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.source_invoices.slice(0, 5).map((i) => {
                const inv = { vendor_id: i.vendor_id, status: i.status };
                return (
                  <tr key={i.id}>
                    <td>
                      <a className="record-link" href={"/invoices/" + i.id}>
                        {i.reference}
                      </a>
                    </td>
                    <td>
                      {view.vendors.find((v) => v.id === inv?.vendor_id)
                        ?.name || "View record"}
                    </td>
                    <td>{i.due_date}</td>
                    <td>
                      <Status value={inv?.status || "APPROVED"} />
                    </td>
                    <td className="num">
                      <Money value={i.amount} />
                    </td>
                    <td>
                      <a
                        aria-label={"View " + i.reference}
                        href={"/invoices/" + i.id}
                      >
                        <ArrowUpRight size={16} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!p.source_invoices.length && (
            <Empty text="No upcoming obligations." />
          )}
        </div>
      </Panel>
    </>
  );
}

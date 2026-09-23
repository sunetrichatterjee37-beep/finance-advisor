import { useState } from "react";
import { Plus } from "lucide-react";
import { useFinance } from "../components/state";
import {
  Title,
  Panel,
  Money,
  Modal,
  Field,
  ErrorText,
  Empty,
} from "../components/ui";
import { BudgetBar } from "../components/charts";
import { minor, today } from "../domain/money";
export function Budgets() {
  const { view, act, busy } = useFinance();
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("current");
  const [start, setStart] = useState(today().slice(0, 7) + "-01");
  const [end, setEnd] = useState(today());
  function duration(type: string) {
    const s = new Date(start + "T00:00:00Z");
    s.setUTCMonth(
      s.getUTCMonth() + (type === "year" ? 12 : type === "quarter" ? 3 : 1),
    );
    s.setUTCDate(s.getUTCDate() - 1);
    setEnd(s.toISOString().slice(0, 10));
  }
  function open(b: any) {
    setSelected(b);
    setStart(b.period_start || today().slice(0, 7) + "-01");
    setEnd(
      b.period_end ||
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10),
    );
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await act("budget", {
        id: selected.id,
        category_id: f.get("category"),
        period_start: start,
        period_end: end,
        budget_minor: minor(String(f.get("amount"))),
        currency_code: "INR",
      });
      setSelected(null);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const budgets = view.metrics.budgets.filter(
    (b) =>
      period === "all" ||
      (b.period_start <= view.metrics.asOf &&
        b.period_end >= view.metrics.asOf),
  );
  return (
    <>
      <Title
        eyebrow="SPENDING CONTROL"
        title="Budgets"
        description="See what is spent, committed, and still available."
        action={
          view.actor.role !== "viewer" && (
            <button className="primary" onClick={() => open({})}>
              <Plus size={16} />
              Create budget
            </button>
          )
        }
      />
      <div className="tabs">
        <button
          className={period === "current" ? "selected" : ""}
          onClick={() => setPeriod("current")}
        >
          Current periods
        </button>
        <button
          className={period === "all" ? "selected" : ""}
          onClick={() => setPeriod("all")}
        >
          All periods
        </button>
      </div>
      <div className="budget-cards">
        {budgets.map((b) => (
          <Panel
            key={b.id}
            title={b.name}
            meta={
              view.actor.role !== "viewer" && (
                <button className="text-button" onClick={() => open(b)}>
                  Edit
                </button>
              )
            }
          >
            <p className="muted">
              {b.period_start} — {b.period_end}
            </p>
            <div className="budget-big">
              <Money value={b.budget_minor} />
              <span>{b.utilization.toFixed(1)}% utilized</span>
            </div>
            <BudgetBar
              actual={b.actual}
              committed={b.committed}
              budget={b.budget_minor}
            />
            <dl className="detail-list">
              <div>
                <dt>Actual payments</dt>
                <dd>
                  <Money value={b.actual} />
                </dd>
              </div>
              <div>
                <dt>Approved commitments</dt>
                <dd>
                  <Money value={b.committed} />
                </dd>
              </div>
              <div className={"total " + (b.remaining < 0 ? "red-text" : "")}>
                <dt>Remaining</dt>
                <dd>
                  <Money value={b.remaining} />
                </dd>
              </div>
            </dl>
            <details className="evidence">
              <summary>View supporting invoices</summary>
              <div className="source-links">
                {b.source_records.map((id) => (
                  <a key={id} href={"/invoices/" + id}>
                    {id}
                  </a>
                ))}
              </div>
            </details>
          </Panel>
        ))}
      </div>
      {!budgets.length && (
        <Empty text="No budgets for this period. Create a category budget to get started." />
      )}
      <p className="muted">
        Budgets use invoice-date periods. Actual is the paid portion of those
        invoices; committed is their approved unpaid balance.
      </p>
      {selected && (
        <Modal
          title={selected.id ? "Edit budget" : "Create budget"}
          onClose={() => setSelected(null)}
        >
          <form onSubmit={save}>
            <Field label="Category">
              <select
                name="category"
                defaultValue={selected.category_id}
                required
              >
                {view.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Period start">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </Field>
            <div className="actions">
              {["month", "quarter", "year"].map((x) => (
                <button type="button" key={x} onClick={() => duration(x)}>
                  {x}
                </button>
              ))}
            </div>
            <Field label="Period end">
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </Field>
            <Field label="Budget (₹)">
              <input
                name="amount"
                required
                defaultValue={
                  selected.budget_minor ? selected.budget_minor / 100 : ""
                }
              />
            </Field>
            <ErrorText error={error} />
            <button className="primary" disabled={busy}>
              Save budget
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

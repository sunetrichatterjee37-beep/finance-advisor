import { VendorHistory } from "../components/vendor-history";
import { useState } from "react";
import { useFinance } from "../components/state";
import { Title, Panel, Money, Modal, Field, ErrorText } from "../components/ui";
export function Vendors() {
  const { view, act, busy } = useFinance();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await act("vendor", {
        name: f.get("name"),
        email: f.get("email"),
        category: f.get("category"),
      });
      setSelected("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const vendor = view.metrics.vendors.find((v) => v.id === selected);
  return (
    <>
      <Title
        eyebrow="SUPPLIER INTELLIGENCE"
        title="Vendors"
        description="Understand supplier spending, outstanding balances, and invoice patterns."
        action={
          view.actor.role !== "viewer" && (
            <button className="primary" onClick={() => setSelected("new")}>
              Add vendor
            </button>
          )
        }
      />
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th className="num">Paid spend</th>
                <th className="num">Invoices</th>
                <th className="num">Average</th>
                <th className="num">Largest</th>
                <th className="num">Outstanding</th>
                <th className="num">Overdue</th>
                <th className="num">Signals</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {view.metrics.vendors.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.name}</strong>
                    <small>{v.category}</small>
                  </td>
                  <td className="num">
                    <Money value={v.spend} />
                  </td>
                  <td className="num">{v.count}</td>
                  <td className="num">
                    <Money value={v.average} />
                  </td>
                  <td className="num">
                    <Money value={v.largest} />
                  </td>
                  <td className="num">
                    <Money value={v.outstanding} />
                  </td>
                  <td className="num">
                    <Money value={v.overdue} />
                  </td>
                  <td className="num">{v.risk_signals}</td>
                  <td>
                    <button onClick={() => setSelected(v.id)}>
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {selected && (
        <Modal
          title={selected === "new" ? "Add vendor" : vendor?.name || "Vendor"}
          onClose={() => setSelected("")}
        >
          {selected === "new" ? (
            <form onSubmit={save}>
              <Field label="Vendor name">
                <input name="name" required />
              </Field>
              <Field label="Email">
                <input name="email" type="email" />
              </Field>
              <Field label="Category">
                <input name="category" />
              </Field>
              <ErrorText error={error} />
              <button className="primary" disabled={busy}>
                Save vendor
              </button>
            </form>
          ) : (
            <>
              <p>
                Overdue: <Money value={vendor?.overdue || 0} />
              </p>
              {(vendor?.count || 0) < 3 && (
                <p className="notice">
                  Limited history — anomaly confidence is reduced.
                </p>
              )}
              {vendor && <VendorHistory vendor={vendor} />}
            </>
          )}
        </Modal>
      )}
    </>
  );
}

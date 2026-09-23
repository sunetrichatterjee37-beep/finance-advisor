import { useState, useEffect } from "react";
import { Plus, Upload, Search, ArrowUpRight } from "lucide-react";
import { useFinance, unwrap, type View } from "../components/state";
import { viewFn } from "../server/api";
import {
  Title,
  Panel,
  Status,
  Money,
  Modal,
  Empty,
  ErrorText,
} from "../components/ui";
import { InvoiceForm } from "../components/invoice-form";
import { Importer } from "../components/importer";
export function Invoices() {
  const { view } = useFinance();
  const [data, setData] = useState<View>(view);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vendor, setVendor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date");
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canWrite = view.actor.role !== "viewer";
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("new") && canWrite)
      setModal("manual");
  }, []);
  useEffect(() => {
    let stale = false;
    const timer = setTimeout(() => {
      setLoading(true);
      unwrap(viewFn({ data: { page, search, status, vendor, from, to, sort } }))
        .then((d) => {
          if (!stale) setData(d);
        })
        .catch((e) => setError(e.message))
        .finally(() => {
          if (!stale) setLoading(false);
        });
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [page, search, status, vendor, from, to, sort, view.revision]);
  return (
    <>
      <Title
        eyebrow="FINANCIAL RECORDS"
        title="Invoices"
        description="Every obligation, from first review to final payment."
        action={
          canWrite && (
            <div className="actions">
              <button className="secondary" onClick={() => setModal("import")}>
                <Upload size={16} />
                Import
              </button>
              <button className="primary" onClick={() => setModal("manual")}>
                <Plus size={16} />
                Add invoice
              </button>
            </div>
          )
        }
      />
      <div className="summary-strip">
        <span>
          <strong>{data.invoice_count}</strong> matching invoices
        </span>
        <span>
          Outstanding <Money value={view.metrics.payables} />
        </span>
        <span>
          Overdue <Money value={view.metrics.overdue_payables} />
        </span>
      </div>
      <Panel>
        <div className="filterbar">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search invoices"
              placeholder="Search invoices or vendors…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {[
              "PENDING_REVIEW",
              "APPROVED",
              "SCHEDULED",
              "PAID",
              "REJECTED",
              "INVESTIGATION",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filter vendor"
            value={vendor}
            onChange={(e) => {
              setVendor(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All vendors</option>
            {view.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort invoices"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date">Latest first</option>
            <option value="amount">Highest amount</option>
          </select>
          <input
            aria-label="From invoice date"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
          <input
            aria-label="To invoice date"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <ErrorText error={error} />
        {loading && (
          <div role="status" className="loading-line">
            Updating invoices…
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Invoice / category</th>
                <th>Vendor</th>
                <th>Due date</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th>Risk</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td>
                    <a className="record-link" href={"/invoices/" + i.id}>
                      {i.invoice_number}
                    </a>
                    <small>
                      {
                        view.categories.find((c) => c.id === i.category_id)
                          ?.name
                      }
                    </small>
                  </td>
                  <td>
                    {view.vendors.find((v) => v.id === i.vendor_id)?.name}
                  </td>
                  <td>{i.due_date}</td>
                  <td className="num">
                    <Money value={i.total_minor} />
                  </td>
                  <td>
                    <Status value={i.status} />
                  </td>
                  <td>
                    <Status
                      value={
                        data.risks.find((r) => r.invoice_id === i.id)
                          ?.severity || "CLEAR"
                      }
                    />
                  </td>
                  <td>
                    <a
                      href={"/invoices/" + i.id}
                      aria-label={"View " + i.invoice_number}
                    >
                      <ArrowUpRight size={17} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.invoices.length && (
            <Empty text="No invoices match your filters." />
          )}
        </div>
        <div className="pagination">
          <span>
            Page {page + 1} · {data.invoice_count} records
          </span>
          <div className="actions">
            <button
              disabled={page === 0 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              disabled={(page + 1) * 25 >= data.invoice_count || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </Panel>
      {modal && (
        <Modal
          title={modal === "manual" ? "Add invoice" : "Import financial data"}
          onClose={() => setModal("")}
        >
          {modal === "manual" ? (
            <InvoiceForm onDone={() => setModal("")} />
          ) : (
            <Importer onDone={() => setModal("")} />
          )}
        </Modal>
      )}
    </>
  );
}

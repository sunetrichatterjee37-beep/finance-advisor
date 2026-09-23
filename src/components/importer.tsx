import { useState } from "react";
import { Upload, FileSpreadsheet, FileImage } from "lucide-react";
import { csvFn, importFn, uploadFn } from "../server/api";
import { unwrap, useFinance } from "./state";
import { Field, ErrorText, Status } from "./ui";
import { InvoiceForm } from "./invoice-form";
export function Importer({ onDone }: { onDone: () => void }) {
  const { refresh } = useFinance();
  const [mode, setMode] = useState("csv");
  const [text, setText] = useState("");
  const [name, setName] = useState("import.csv");
  const [preview, setPreview] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  async function validate() {
    setBusy(true);
    setError("");
    try {
      const r = await unwrap(csvFn({ data: { text, mapping } }));
      setPreview(r);
      setMapping(r.mapping);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function file(file: File) {
    setName(file.name);
    setError("");
    setPreview(null);
    if (mode === "csv") {
      setText(await file.text());
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file under 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      setExtracted(
        await unwrap(
          uploadFn({ data: { name: file.name, mime: file.type, base64 } }),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    try {
      await unwrap(importFn({ data: { text, mapping, name } }));
      await refresh();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="tabs">
        <button
          className={mode === "csv" ? "selected" : ""}
          onClick={() => {
            setMode("csv");
            setError("");
          }}
        >
          <FileSpreadsheet size={16} />
          CSV import
        </button>
        <button
          className={mode === "document" ? "selected" : ""}
          onClick={() => {
            setMode("document");
            setError("");
          }}
        >
          <FileImage size={16} />
          PDF / image
        </button>
      </div>
      <label className="upload-zone">
        <Upload size={26} />
        <strong>
          {busy
            ? "Processing…"
            : "Choose a " + (mode === "csv" ? "CSV file" : "PDF, PNG or JPEG")}
        </strong>
        <span>
          {mode === "csv"
            ? "Up to 500 rows · 2 MB maximum"
            : "10 MB maximum · Human review required"}
        </span>
        <input
          aria-label="Choose import file"
          disabled={busy}
          type="file"
          accept={mode === "csv" ? ".csv" : ".pdf,.png,.jpg,.jpeg"}
          onChange={(e) => e.target.files?.[0] && file(e.target.files[0])}
        />
      </label>
      <ErrorText error={error} />
      {mode === "csv" && (
        <>
          <a className="text-link" href="/sample-invoices.csv" download>
            Download CSV template
          </a>
          <Field label="CSV data — edit corrections here">
            <textarea
              className="csv-editor"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              placeholder="vendor,invoice_number,category,invoice_date,due_date,subtotal,tax,total,description"
            />
          </Field>
          <button
            className="secondary"
            disabled={busy || !text}
            onClick={validate}
          >
            Validate & preview
          </button>
          {preview && (
            <>
              <h3>Column mapping</h3>
              <div className="form-grid">
                {Object.keys(preview.mapping).map((key) => (
                  <Field key={key} label={key.replaceAll("_", " ")}>
                    <select
                      value={mapping[key]}
                      onChange={(e) => {
                        setMapping({ ...mapping, [key]: e.target.value });
                        setPreview({ ...preview, stale: true });
                      }}
                    >
                      {preview.headers.map((h: string) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <p>
                {preview.rows.filter((r: any) => !r.error).length} valid ·{" "}
                {preview.rows.filter((r: any) => r.error).length} need
                correction
              </p>
              {preview.already_imported && (
                <ErrorText error="This file was already imported." />
              )}
              <div className="import-preview">
                {preview.rows.map((r: any) => (
                  <div key={r.row}>
                    <strong>Row {r.row}</strong>{" "}
                    {r.error || r.data.invoice_number}{" "}
                    <Status value={r.error ? "REJECTED" : "APPROVED"} />
                  </div>
                ))}
              </div>
              <button
                className="primary"
                disabled={
                  busy ||
                  preview.stale ||
                  preview.already_imported ||
                  !preview.rows.length ||
                  preview.rows.some((r: any) => r.error)
                }
                onClick={commit}
              >
                Confirm import
              </button>
              {preview.stale && (
                <p>Validate again after changing column mapping.</p>
              )}
            </>
          )}
        </>
      )}
      {mode === "document" && extracted && (
        <>
          {extracted.warning && (
            <div className="notice">{extracted.warning}</div>
          )}
          <h3>Review extracted fields</h3>
          <p className="muted">
            Check these values against the original document. Missing fields
            need manual entry.
          </p>
          <InvoiceForm
            onDone={onDone}
            initial={extracted.fields || {}}
            source={extracted.source}
            fileId={extracted.file_id}
          />
        </>
      )}
    </>
  );
}

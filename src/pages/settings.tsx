import { useState, useEffect } from "react";
import { useFinance, unwrap } from "../components/state";
import { membersFn, roleFn, addMemberFn } from "../server/api";
import {
  Title,
  Panel,
  Status,
  ErrorText,
  Empty,
  Field,
} from "../components/ui";
import { minor } from "../domain/money";
import type { Role } from "../domain/types";
export function Settings() {
  const { view, act, busy, refresh: actRefresh } = useFinance();
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    unwrap(membersFn())
      .then(setMembers)
      .catch((e) => setError(e.message));
  }, []);
  if (view.actor.role !== "admin")
    return <Empty text="Administrator access required." />;
  return (
    <>
      <Title
        title="Workspace settings"
        description="Company access and service connection status."
      />
      <Panel title="Connection readiness">
        <div className="readiness-row">
          <span>Financial engine</span>
          <strong>Active · deterministic calculations</strong>
        </div>
        <div className="readiness-row">
          <span>Workspace data</span>
          <strong>
            {view.actor.mode === "demo"
              ? "Fictional demo ledger"
              : "Connected PostgreSQL company"}
          </strong>
        </div>
        <div className="readiness-row">
          <span>AI advisor & document extraction</span>
          <strong>
            {view.ai_connected
              ? "Configured · verify model access"
              : "Not connected"}
          </strong>
        </div>
        <div className="readiness-row">
          <span>Company roles</span>
          <strong>
            {view.actor.mode === "demo"
              ? "Demo simulation"
              : "Server-enforced membership"}
          </strong>
        </div>
      </Panel>
      <div className="overview-grid">
        <Panel title="Company">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await act("company", {
                  name: f.get("name"),
                  opening_cash_minor: minor(String(f.get("cash"))),
                  opening_date: f.get("date"),
                });
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label="Company name">
              <input name="name" defaultValue={view.company.name} required />
            </Field>
            <Field label="Opening cash (₹)">
              <input
                name="cash"
                defaultValue={view.company.opening_cash_minor / 100}
                required
              />
            </Field>
            <Field label="Opening cash date">
              <input
                name="date"
                type="date"
                defaultValue={view.company.opening_date}
                required
              />
            </Field>
            <p className="muted">
              Cash at the start of this date, before the receipts and payments
              recorded in this ledger.
            </p>
            <button className="primary" disabled={busy}>
              Save company settings
            </button>
          </form>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{view.company.name}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>INR</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>
                {view.actor.mode === "demo"
                  ? "Isolated fictional demo"
                  : "Connected company"}
              </dd>
            </div>
            <div>
              <dt>AI explanations</dt>
              <dd>{view.ai_connected ? "Configured" : "Connection pending"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Members & roles">
          {view.actor.mode !== "demo" && (
            <form
              className="member-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = new FormData(form);
                try {
                  await unwrap(
                    addMemberFn({
                      data: {
                        email: String(f.get("email")),
                        role: f.get("role") as Role,
                      },
                    }),
                  );
                  setMembers(await unwrap(membersFn()));
                  form.reset();
                  setError("");
                  await actRefresh();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Field label="Add verified account">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                />
              </Field>
              <Field label="Company role">
                <select name="role">
                  <option value="viewer">Viewer</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <button className="primary">Add member</button>
              <p className="muted">
                The colleague must first register and verify their email. Adding
                them grants access to this company.
              </p>
            </form>
          )}

          <ErrorText error={error} />
          {members.map((m) => (
            <div className="list-row" key={m.user_id}>
              <span>
                {m.full_name}
                <small>{m.email || m.user_id}</small>
              </span>
              <select
                aria-label={"Role for " + m.full_name}
                disabled={view.actor.mode === "demo"}
                value={m.role}
                onChange={async (e) => {
                  try {
                    await unwrap(
                      roleFn({
                        data: {
                          user_id: m.user_id,
                          role: e.target.value as Role,
                        },
                      }),
                    );
                    setMembers(await unwrap(membersFn()));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {["admin", "finance", "viewer"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
          {view.actor.mode === "demo" && (
            <p className="muted">
              To test a different role, sign out and choose Finance or Viewer on
              the demo sign-in screen.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

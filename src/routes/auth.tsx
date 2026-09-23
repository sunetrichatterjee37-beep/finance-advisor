import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChartNoAxesCombined, ArrowRight, ShieldCheck } from "lucide-react";
import { configFn, loginFn, signupFn } from "../server/api";
import { unwrap } from "../components/state";
import { Field, ErrorText } from "../components/ui";
import type { Role } from "../domain/types";
export const Route = createFileRoute("/auth")({
  loader: () => configFn(),
  component: Auth,
});
function Auth() {
  const config = Route.useLoaderData();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      if (signup) {
        setMessage(
          await unwrap(
            signupFn({
              data: {
                email: String(f.get("email")),
                password: String(f.get("password")),
                name: String(f.get("name")),
                company: String(f.get("company")),
              },
            }),
          ),
        );
      } else {
        await unwrap(
          loginFn({
            data: {
              email: String(f.get("email")),
              password: String(f.get("password")),
            },
          }),
        );
        window.location.href = "/";
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo(role: Role) {
    setBusy(true);
    try {
      await unwrap(loginFn({ data: { role } }));
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <ChartNoAxesCombined />
          </span>
          Finance Advisor
        </div>
        <div>
          <div className="eyebrow">CLARITY. WITH EVIDENCE.</div>
          <h1>
            A clearer view
            <br />
            of your business
            <br />
            finances.
          </h1>
          <p>
            Understand your cash. Review what needs attention. Make the decision
            with the evidence in front of you.
          </p>
        </div>
        <p>
          <ShieldCheck size={18} /> Your numbers. Your decisions.
        </p>
      </section>
      <section className="auth-form">
        <h2>
          {config.cloud
            ? signup
              ? "Create your workspace"
              : "Welcome back"
            : "Your finance workspace"}
        </h2>
        <p>
          {!config.cloud
            ? "Explore invoice reviews, cash flow and risk alerts with fictional data."
            : signup
              ? "Start with a secure company ledger."
              : "Sign in to your financial workspace."}
        </p>
        {config.cloud && (
          <>
            <form onSubmit={submit}>
              {signup && (
                <>
                  <Field label="Full name">
                    <input name="name" required />
                  </Field>
                  <Field label="Company name">
                    <input name="company" required />
                  </Field>
                </>
              )}
              <Field label="Work email">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={signup ? 12 : 1}
                  required
                />
              </Field>
              <ErrorText error={error} />
              {message && <p role="status">{message}</p>}
              <button className="primary full" disabled={busy}>
                {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>
            <button className="text-button" onClick={() => setSignup(!signup)}>
              {signup
                ? "Already have an account? Sign in"
                : "Create an account"}
            </button>
          </>
        )}
        {!config.cloud && <ErrorText error={error} />}
        {config.demo && (
          <div className="demo-entry">
            <strong>Explore the working demo</strong>
            <p>
              Fictional company data. Changes stay in your isolated demo
              workspace.
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={() => demo("admin")}
            >
              Open demo workspace <ArrowRight size={17} />
            </button>
            <div className="demo-roles">
              <button disabled={busy} onClick={() => demo("finance")}>
                Finance role
              </button>
              <button disabled={busy} onClick={() => demo("viewer")}>
                Viewer role
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

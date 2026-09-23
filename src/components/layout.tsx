import { useFinancialContextTool } from "./webmcp";
import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  ChartNoAxesCombined,
  ChartPie,
  ShieldCheck,
  Building2,
  Sparkles,
  History,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { useFinance, unwrap } from "./state";
import { logoutFn, sessionFn, switchFn } from "../server/api";
const links = [
  ["/", "Overview", LayoutDashboard],
  ["/invoices", "Invoices", FileText],
  ["/ledger", "Ledger", BookOpen],
  ["/cash-flow", "Cash flow", ChartNoAxesCombined],
  ["/budgets", "Budgets", ChartPie],
  ["/risk", "Risk center", ShieldCheck],
  ["/vendors", "Vendors", Building2],
  ["/advisor", "AI advisor", Sparkles],
  ["/audit", "Audit trail", History],
  ["/settings", "Settings", Settings],
] as const;
export function Layout({ children }: { children: React.ReactNode }) {
  const { view, notice, setNotice, refresh } = useFinance();
  useFinancialContextTool(view);
  const path = useLocation().pathname;
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>(
    [],
  );
  async function companyList() {
    const s = await unwrap(sessionFn());
    setCompanies(s.companies);
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <a className="brand" href="/">
          <span className="brand-mark">
            <ChartNoAxesCombined size={23} />
          </span>
          <span>
            Finance<span className="brand-sub">Advisor</span>
          </span>
        </a>
        <button className="company-switch" onClick={companyList}>
          <span className="company-avatar">{view.company.name[0]}</span>
          <span>
            <strong>{view.company.name.split(" ")[0]}</strong>
            <small>Financial workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        {companies.length > 0 && (
          <select
            aria-label="Select company"
            value={view.company.id}
            onChange={async (e) => {
              await unwrap(switchFn({ data: e.target.value }));
              window.location.href = "/";
            }}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links
            .filter(
              ([href]) =>
                !["/audit", "/settings"].includes(href) ||
                view.actor.role === "admin",
            )
            .map(([href, label, Icon]) => (
              <a
                key={href}
                href={href}
                className={
                  (href === "/" ? path === "/" : path.startsWith(href))
                    ? "active"
                    : ""
                }
              >
                <Icon size={19} />
                <span>{label}</span>
                {href === "/risk" && <b>{view.risk_count}</b>}
              </a>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="evidence-note">
            <ShieldCheck size={20} />
            <strong>Built on evidence</strong>
            <p>Every insight leads back to your financial records.</p>
          </div>
          <div className="profile">
            <span className="avatar">{view.actor.name.slice(0, 1)}</span>
            <span>
              <strong>{view.actor.name}</strong>
              <small>
                {view.actor.role} ·{" "}
                {view.actor.mode === "demo"
                  ? "demo workspace"
                  : "company member"}
              </small>
            </span>
            <button
              aria-label="Sign out"
              className="icon-button"
              onClick={async () => {
                await logoutFn();
                window.location.href = "/auth";
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-expanded={open}
            aria-label="Open navigation"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {links.find(([h]) => h === path)?.[1] || "Invoice details"}
            </strong>
          </div>
          <div className="topbar-right">
            <button
              className="refresh-button"
              onClick={() => refresh().catch((e) => setNotice(e.message))}
              aria-label="Refresh financial data"
            >
              Refresh data
            </button>
            {view.actor.mode === "demo" && (
              <span className="demo-tag">Fictional demo data</span>
            )}
            <a href="/advisor" className="top-advisor">
              <Sparkles size={16} /> Ask advisor <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main id="main-content">
          {notice && (
            <div role="status" className="toast">
              {notice}
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {children}
        </main>
        <footer>
          Finance Advisor{" "}
          <span>
            INR · Updated{" "}
            {new Date(view.metrics.updated_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST
          </span>
        </footer>
      </div>
    </div>
  );
}

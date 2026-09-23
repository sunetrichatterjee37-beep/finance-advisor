import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import "../styles.css";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Finance Advisor | Financial workspace" },
      {
        name: "description",
        content:
          "Evidence-based financial intelligence, invoice review, cash flow and budgets.",
      },
    ],
    links: [{ rel: "icon", href: "/favicon.svg" }],
  }),
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: () => (
    <main className="auth">
      <h1>Page not found</h1>
      <a href="/">Return to dashboard</a>
    </main>
  ),
  errorComponent: () => (
    <main className="auth">
      <h1>We couldn’t load this page.</h1>
      <a href="/auth">Sign in again</a>
    </main>
  ),
});

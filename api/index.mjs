import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import app from "../dist/server/server.js";

const root = resolve("dist/client");

const mime = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".csv": "text/csv",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export default async function handler(req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `${protocol}://${host}`);

    // Serve frontend static files
    if (req.method === "GET" || req.method === "HEAD") {
      const file = resolve(
        root,
        "." + decodeURIComponent(url.pathname)
      );

      if (file === root || file.startsWith(root + sep)) {
        try {
          if ((await stat(file)).isFile()) {
            res.statusCode = 200;
            res.setHeader(
              "Content-Type",
              mime[extname(file)] || "application/octet-stream"
            );
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader(
              "Cache-Control",
              url.pathname.startsWith("/assets/")
                ? "public,max-age=31536000,immutable"
                : "no-cache"
            );

            res.end(
              req.method === "HEAD"
                ? undefined
                : await readFile(file)
            );
            return;
          }
        } catch {}
      }
    }

    // Convert Vercel request to Web Request
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(
          key,
          Array.isArray(value) ? value.join(",") : value
        );
      }
    }

    const chunks = [];

    if (req.method !== "GET" && req.method !== "HEAD") {
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      ...(chunks.length > 0
        ? { body: Buffer.concat(chunks) }
        : {}),
    });

    const response = await app.fetch(request);

    res.statusCode = response.status;

    for (const [key, value] of response.headers) {
      if (key !== "set-cookie") {
        res.setHeader(key, value);
      }
    }

    const cookies = response.headers.getSetCookie?.() || [];

    if (cookies.length) {
      res.setHeader("set-cookie", cookies);
    }

    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("This request could not be completed.");
  }
}

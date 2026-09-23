export function minor(value: string | number): number {
  const s = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error(
      "Enter a non-negative amount with at most two decimal places.",
    );
  const [a, b = ""] = s.split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 1_000_000_000_000)
    throw new Error("Amount is too large.");
  return n;
}
export function money(n: number, compact = true): string {
  const value = n / 100;
  const abs = Math.abs(value);
  if (compact && abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (compact && abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
export const today = () => new Date().toISOString().slice(0, 10);
export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dateValid(d: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    !Number.isNaN(Date.parse(d)) &&
    new Date(d).toISOString().slice(0, 10) === d
  );
}

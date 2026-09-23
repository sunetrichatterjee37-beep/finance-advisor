import { ChevronLeft, ChevronRight } from "lucide-react";
export function Pagination({
  page,
  pages,
  total,
  busy = false,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  busy?: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {total.toLocaleString("en-IN")} records · Page {page + 1} of {pages}
      </span>
      <div>
        <button
          disabled={busy || page === 0}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          disabled={busy || page >= pages - 1}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

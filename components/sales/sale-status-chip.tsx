import { SALE_STATUS_LABELS, type SaleStatus } from "@/lib/sale-themes"

// Colours come from .sale-status-chip in globals.css, for light and dark:
// the theme layers there re-colour Tailwind's slate, sky and emerald
// classes, which left these chips unreadable.
export function SaleStatusChip({ status }: { status: SaleStatus }) {
    const known: SaleStatus = status in SALE_STATUS_LABELS ? status : "draft"
    return (
        <span data-testid="sale-status" data-status={known} className="sale-status-chip inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            {status === "live" ? <span aria-hidden="true" data-testid="sale-status-dot" className="sale-status-dot mr-1.5 h-1.5 w-1.5 rounded-full" /> : null}
            {SALE_STATUS_LABELS[status] || status}
        </span>
    )
}

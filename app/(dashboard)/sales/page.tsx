"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CalendarClock, Loader2, Megaphone, Plus, BadgePercent } from "lucide-react"
import { SaleStatusChip } from "@/components/sales/sale-status-chip"
import { apiFetch } from "@/lib/api"
import { useDashboardUser } from "@/components/dashboard-context"
import { saleHeaderBackground, saleTheme, timeUntil, type SaleStatus } from "@/lib/sale-themes"

interface SaleListItem {
    id: string
    name: string
    theme: string
    audience: "customers" | "wholesalers" | "both"
    status: SaleStatus
    startsAt: string
    endsAt: string
    endedAt: string | null
    customerPercent: number | null
    wholesalerPercent: number | null
    productCount: number
    lastAnnouncedAt: string | null
    results: { orders: number; units: number; revenue: number }
}

const AUDIENCE_LABELS = { customers: "Customers", wholesalers: "Wholesalers", both: "Customers and wholesalers" }
const formatDate = (value: string) =>
    new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

function whenText(sale: SaleListItem) {
    if (sale.status === "upcoming") return `Starts in ${timeUntil(sale.startsAt)}`
    if (sale.status === "live") return `Ends in ${timeUntil(sale.endsAt)}`
    if (sale.status === "ended") return `Ended ${formatDate(sale.endedAt || sale.endsAt)}`
    return `${formatDate(sale.startsAt)} to ${formatDate(sale.endsAt)}`
}

// Sale pages (Diwali Sale, Stock Clearance, ...): the admin links them from
// banners; their prices apply in the app only between their dates.
export default function SalesPage() {
    const isAdmin = useDashboardUser()?.role === "admin"
    const [sales, setSales] = useState<SaleListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        apiFetch("/admin/sales")
            .then(async (res) => {
                const body = await res.json()
                if (cancelled) return
                if (!res.ok) throw new Error(body?.message || "Couldn't load sales")
                setSales(Array.isArray(body.data) ? body.data : [])
            })
            .catch((error) => {
                if (!cancelled) toast.error(error instanceof Error ? error.message : "Couldn't load sales")
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const order: Record<SaleStatus, number> = { live: 0, upcoming: 1, draft: 2, ended: 3 }
    const sorted = [...sales].sort((a, b) => order[a.status] - order[b.status])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Sales</h1>
                    <p className="text-[#919191]">
                        Sale pages like Diwali Sale or Stock Clearance, one at a time. Link one from a banner (Banners › Link type: Sale).
                    </p>
                </div>
                {isAdmin ? (
                <Link href="/sales/new" className="inline-flex h-10 items-center justify-center rounded-md bg-[#86efac] px-4 text-sm font-medium text-black shadow-sm hover:bg-[#86efac]/90">
                    <Plus className="mr-2 h-4 w-4" /> New sale
                </Link>
                ) : null}
            </div>

            {isLoading ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-[28px] border border-[#333] bg-[#161616]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-[28px] border border-[#333] bg-[#161616] text-center text-[#919191]">
                    <BadgePercent className="h-10 w-10 opacity-50" />
                    <p className="font-medium text-gray-300">Create your first sale</p>
                    <p className="text-sm">Pick a look, the dates, the discount and the products.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {sorted.map((sale) => {
                        const theme = saleTheme(sale.theme)
                        return (
                            <Link
                                key={sale.id}
                                href={`/sales/${sale.id}`}
                                data-testid="sale-card"
                                className="group overflow-hidden rounded-[24px] border border-[#333] bg-[#161616] transition hover:border-[#444]"
                            >
                                <div className="flex items-center justify-between px-4 py-3" style={{ backgroundImage: saleHeaderBackground(theme) }}>
                                    <div className="min-w-0">
                                        <p className="truncate text-lg font-bold" style={{ color: "#FFFFFF" }}>{sale.name}</p>
                                        <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.8)" }}>{theme.label}</p>
                                    </div>
                                    <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.onAccent }}>
                                        {[sale.customerPercent && `${sale.customerPercent}%`, sale.wholesalerPercent && `${sale.wholesalerPercent}% dealers`].filter(Boolean).join(" · ") || "—"}
                                    </span>
                                </div>
                                <div className="space-y-2 px-4 py-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <SaleStatusChip status={sale.status} />
                                        <span className="flex items-center gap-1 text-xs text-[#919191]"><CalendarClock className="h-3.5 w-3.5" />{whenText(sale)}</span>
                                    </div>
                                    <p className="text-xs text-[#919191]">
                                        {AUDIENCE_LABELS[sale.audience]} · {sale.productCount} {sale.productCount === 1 ? "product" : "products"}
                                        {sale.lastAnnouncedAt ? <> · <Megaphone className="inline h-3 w-3" /> announced {formatDate(sale.lastAnnouncedAt)}</> : null}
                                    </p>
                                    {sale.status !== "draft" ? (
                                        <p className="text-xs text-gray-300">
                                            <span className="font-semibold">{sale.results.orders}</span> orders · <span className="font-semibold">{sale.results.units}</span> units · <span className="font-semibold">₹{Math.round(sale.results.revenue).toLocaleString("en-IN")}</span>
                                        </p>
                                    ) : null}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

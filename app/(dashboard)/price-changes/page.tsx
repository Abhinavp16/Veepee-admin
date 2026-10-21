"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { CalendarClock, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeleton } from "@/components/table-skeleton"
import { apiFetch } from "@/lib/api"
import { formatDate, formatDateTime } from "@/lib/format"

interface PriceChange {
    _id: string
    productName: string
    productSku: string
    previousRetailPrice: number
    previousWholesalePrice: number
    previousMrp: number | null
    newRetailPrice: number | null
    newWholesalePrice: number | null
    newMrp: number | null
    scheduleType: "immediate" | "schedule_24h" | "schedule_48h" | "custom"
    effectiveAt: string
    status: "scheduled" | "applied" | "superseded" | "cancelled"
    adminName: string
    createdAt: string
}

const STATUSES = [
    { value: "", label: "All" },
    { value: "scheduled", label: "Scheduled" },
    { value: "applied", label: "Applied" },
    { value: "superseded", label: "Replaced" },
    { value: "cancelled", label: "Cancelled" },
]

const STATUS_STYLE: Record<PriceChange["status"], string> = {
    scheduled: "bg-amber-500/10 text-amber-400",
    applied: "bg-green-500/10 text-green-400",
    superseded: "bg-slate-500/10 text-slate-300",
    cancelled: "bg-red-500/10 text-red-400",
}

const MODE_LABEL: Record<PriceChange["scheduleType"], string> = {
    immediate: "Immediately",
    schedule_24h: "In 24 hours",
    schedule_48h: "In 48 hours",
    custom: "Custom date",
}

const money = (value: number | null | undefined) => (value == null ? "—" : `₹${value.toLocaleString("en-IN")}`)

function changeLines(row: PriceChange) {
    const lines: string[] = []
    if (row.newRetailPrice != null) lines.push(`Retail ${money(row.previousRetailPrice)} → ${money(row.newRetailPrice)}`)
    if (row.newWholesalePrice != null) lines.push(`Wholesale ${money(row.previousWholesalePrice)} → ${money(row.newWholesalePrice)}`)
    if (row.newMrp != null) lines.push(`MRP ${money(row.previousMrp)} → ${money(row.newMrp)}`)
    return lines
}

export default function PriceChangesPage() {
    const [rows, setRows] = useState<PriceChange[]>([])
    const [status, setStatus] = useState("")
    const [search, setSearch] = useState("")
    const [query, setQuery] = useState("")
    const [page, setPage] = useState(1)
    const [hasNext, setHasNext] = useState(false)
    const [totalPages, setTotalPages] = useState(1)
    const [scheduledCount, setScheduledCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [cancelling, setCancelling] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: "20" })
            if (status) params.set("status", status)
            if (query) params.set("q", query)
            const response = await apiFetch(`/admin/price-changes?${params}`)
            const body = await response.json()
            if (!response.ok) throw new Error(body.message || "Could not load price changes")
            setRows(body.data || [])
            setHasNext(Boolean(body.pagination?.hasNext))
            setTotalPages(body.pagination?.totalPages || 1)
            setScheduledCount(body.scheduledCount || 0)
        } catch (error: any) {
            toast.error(error.message)
        } finally { setLoading(false) }
    }, [page, status, query])

    useEffect(() => { void load() }, [load])

    function submitSearch(event: FormEvent) {
        event.preventDefault()
        setPage(1)
        setQuery(search.trim())
    }

    async function cancel(row: PriceChange) {
        if (!window.confirm(`Cancel the scheduled price change for ${row.productName}? The current price stays as it is.`)) return
        setCancelling(row._id)
        try {
            const response = await apiFetch(`/admin/price-changes/${row._id}/cancel`, { method: "POST" })
            const body = await response.json()
            if (!response.ok) throw new Error(body.message || "Could not cancel")
            toast.success("Scheduled price change cancelled")
            void load()
        } catch (error: any) {
            toast.error(error.message)
        } finally { setCancelling(null) }
    }

    // Only scheduled changes can be cancelled.
    const anyScheduled = rows.some((row) => row.status === "scheduled")

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#86efac]/10 p-3"><CalendarClock className="h-6 w-6 text-[#86efac]" /></div>
                <div>
                    <h1 className="text-3xl font-bold">Price Changes</h1>
                    <p className="text-sm text-[#919191]">{scheduledCount > 0 ? `${scheduledCount} scheduled to take effect` : "Nothing scheduled right now"}. Scheduled changes go live at 8:00 am India time once they are due.</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                    {STATUSES.map((item) => (
                        <button key={item.value} type="button" onClick={() => { setStatus(item.value); setPage(1) }} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${status === item.value ? "border-[#86efac] bg-[#86efac]/10 text-[#86efac]" : "border-[#333] text-[#919191] hover:text-white"}`}>{item.label}</button>
                    ))}
                </div>
                <form onSubmit={submitSearch} className="flex gap-2">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or SKU" className="w-full border-[#333] bg-[#0D0D0D] text-white md:w-64" />
                    <Button type="submit" variant="outline" className="border-[#333] bg-[#0D0D0D] text-white" aria-label="Search" title="Search"><Search className="h-4 w-4" /></Button>
                </form>
            </div>

            <Card className="border-[#333] bg-[#161616]">
                <CardContent className="p-0">
                    {loading ? <TableSkeleton columns={6} /> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-[#333] hover:bg-transparent">
                                        <TableHead>Product</TableHead>
                                        <TableHead>Change</TableHead>
                                        <TableHead>Takes effect</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>By</TableHead>
                                        {anyScheduled && <TableHead className="text-right">Action</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row._id} className="border-[#333]">
                                            <TableCell><p className="font-medium text-white">{row.productName}</p><p className="text-xs text-[#919191]">{row.productSku}</p></TableCell>
                                            <TableCell className="text-sm text-[#bdbdbd]">{changeLines(row).map((line) => <p key={line}>{line}</p>)}</TableCell>
                                            <TableCell className="text-sm text-[#bdbdbd]"><p>{formatDateTime(row.effectiveAt)}</p><p className="text-xs text-[#919191]">{row.status === "cancelled" || row.status === "superseded" ? "Did not apply" : MODE_LABEL[row.scheduleType]}</p></TableCell>
                                            <TableCell><Badge className={STATUS_STYLE[row.status]}>{STATUSES.find((s) => s.value === row.status)?.label ?? row.status}</Badge></TableCell>
                                            <TableCell className="text-sm text-[#919191]"><p>{row.adminName}</p><p className="text-xs">{formatDate(row.createdAt)}</p></TableCell>
                                            {anyScheduled && <TableCell className="text-right">
                                                {row.status === "scheduled" && (
                                                    <Button size="sm" variant="outline" disabled={cancelling === row._id} onClick={() => cancel(row)} className="border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10">{cancelling === row._id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Cancel</Button>
                                                )}
                                            </TableCell>}
                                        </TableRow>
                                    ))}
                                    {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-[#919191]">No price changes found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="border-[#333] bg-[#0D0D0D] text-white">Previous</Button>
                <span className="self-center text-sm text-[#919191]">Page {page} of {totalPages}</span>
                <Button variant="outline" disabled={!hasNext || loading} onClick={() => setPage(page + 1)} className="border-[#333] bg-[#0D0D0D] text-white">Next</Button>
            </div>
        </div>
    )
}

"use client"

import { useEffect, useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { audienceSummary, linkLabel, type Campaign } from "@/lib/custom-notifications"

// Customers → Custom notification → History: every send, newest first.

const PAGE_SIZE = 20

export function NotificationHistory({ onSendAgain }: { onSendAgain: (campaign: Campaign) => void }) {
    const [items, setItems] = useState<Campaign[]>([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)

    async function load(pageNum: number) {
        setIsLoading(true)
        try {
            const res = await apiFetch(`/admin/customers/notifications/history?page=${pageNum}&limit=${PAGE_SIZE}`)
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.message || "Could not load the history")
            const rows: Campaign[] = Array.isArray(data.data) ? data.data : []
            // A send in between shifts the pages: never list a row twice.
            setItems((current) => {
                if (pageNum === 1) return rows
                const seen = new Set(current.map((row) => row._id))
                return [...current, ...rows.filter((row) => !seen.has(row._id))]
            })
            setPage(pageNum)
            setHasMore(Boolean(data.pagination?.hasNext))
            setLoadFailed(false)
        } catch (error) {
            setLoadFailed(true)
            toast.error(error instanceof Error ? error.message : "Could not load the history")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load(1)
    }, [])

    if (isLoading && items.length === 0) {
        return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#86efac]" /></div>
    }
    if (loadFailed && items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-red-400">Couldn&apos;t load the history.</p>
                <Button type="button" variant="outline" className="border-[#333]" onClick={() => load(1)}>Try again</Button>
            </div>
        )
    }
    if (items.length === 0) {
        return <p className="py-10 text-center text-sm text-gray-500">Nothing sent yet. Notifications you send show up here.</p>
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-[#333] hover:bg-transparent">
                            <TableHead className="text-gray-400 min-w-[220px]">Message</TableHead>
                            <TableHead className="text-gray-400 min-w-[150px]">Sent to</TableHead>
                            <TableHead className="text-gray-400 min-w-[120px]">Opens</TableHead>
                            <TableHead className="text-gray-400 min-w-[130px]">Delivered</TableHead>
                            <TableHead className="text-gray-400 min-w-[130px]">When · who</TableHead>
                            <TableHead className="text-gray-400 text-right"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const failures = item.failed > 0
                            return (
                                <TableRow key={item._id} className="border-[#333] hover:bg-[#1A1A1A] align-top">
                                    <TableCell className="whitespace-normal">
                                        <p className="text-sm font-semibold text-white break-words">{item.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2 break-words">{item.body}</p>
                                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                            <span className="rounded border border-[#333] px-1.5 py-0.5 text-gray-400">{item.titleHi ? "English + हिंदी" : "English"}</span>
                                            {item.couponCode && <span className="rounded border border-[#86efac]/40 px-1.5 py-0.5 text-[#86efac] font-mono">{item.couponCode}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-300 whitespace-normal">
                                        {audienceSummary(item.audience, item.segment, item.productName, undefined, item.installedWithinDays)}
                                        <span className="block text-xs text-gray-500">{item.recipients.toLocaleString("en-IN")} {item.audience === "guests" ? (item.recipients === 1 ? "phone" : "phones") : (item.recipients === 1 ? "person" : "people")}{item.skipped ? ` · ${item.skipped} left out` : ""}</span>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-300 whitespace-normal">{linkLabel(item.link)}</TableCell>
                                    <TableCell className="text-sm whitespace-normal">
                                        {item.status === "sending"
                                            ? <span className="text-gray-400">Sending…</span>
                                            : item.status === "failed"
                                            ? <span className="text-red-400">Failed{item.pushError ? `: ${item.pushError}` : ""}</span>
                                            : item.pushConfigured === false
                                            ? <span className="text-amber-400">Push not sent</span>
                                            : item.phones === 0
                                                ? <span className="text-gray-500">No phones signed in</span>
                                                : <span className={failures ? "text-amber-400" : "text-white"}>{item.delivered.toLocaleString("en-IN")} of {item.phones.toLocaleString("en-IN")}</span>}
                                        <span className="block text-xs text-gray-500">
                                            {failures ? `${item.failed} failed${item.pushError ? ` (${item.pushError})` : ""} · ` : ""}{item.audience === "guests" ? "Push only (no account, so no inbox)" : <>In everyone&apos;s inbox; people without the app signed in get no push</>}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-400 whitespace-normal">
                                        {formatDate(item.createdAt)}
                                        <span className="block">{new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}{item.sentBy?.name ? ` · ${item.sentBy.name}` : ""}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button type="button" variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#1A1A1A] gap-1.5" onClick={() => onSendAgain(item)} aria-label={`Send again: ${item.title}`}>
                                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Send again
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
            {hasMore && (
                <div className="flex justify-center">
                    <Button type="button" variant="outline" disabled={isLoading} onClick={() => load(page + 1)} className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Load more
                    </Button>
                </div>
            )}
        </div>
    )
}

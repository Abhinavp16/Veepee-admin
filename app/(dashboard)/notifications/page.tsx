"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TableSkeleton } from "@/components/table-skeleton"
import { timeAgo, type TeamNotification } from "@/components/notification-bell"
import { apiFetch } from "@/lib/api"

const PAGE_SIZE = 20

export default function NotificationsPage() {
    const router = useRouter()
    const [items, setItems] = useState<TeamNotification[]>([])
    const [page, setPage] = useState(1)
    const [hasNext, setHasNext] = useState(false)
    const [unread, setUnread] = useState(0)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async (target: number) => {
        setLoading(true)
        try {
            const response = await apiFetch(`/admin/notifications?page=${target}&limit=${PAGE_SIZE}`)
            const body = await response.json()
            if (response.ok) {
                setItems(body.data || [])
                setUnread(body.unreadCount || 0)
                setHasNext(Boolean(body.pagination?.hasNext))
                setPage(target)
            }
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { void load(1) }, [load])

    async function markRead(ids?: string[]) {
        await apiFetch("/admin/notifications/mark-read", { method: "POST", body: JSON.stringify(ids ? { ids } : {}) })
        void load(page)
    }

    async function openItem(item: TeamNotification) {
        if (!item.isRead) await markRead([item._id])
        router.push(item.link || "/")
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#86efac]/10 p-3"><Bell className="h-6 w-6 text-[#86efac]" /></div>
                    <div>
                        <h1 className="text-3xl font-bold">Notifications</h1>
                        <p className="text-sm text-[#919191]">{unread > 0 ? `${unread} unread` : "You are all caught up"}</p>
                    </div>
                </div>
                <Button variant="outline" disabled={unread === 0} onClick={() => markRead()} className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>
            </div>
            <Card className="border-[#333] bg-[#161616]">
                <CardContent className="p-0">
                    {loading ? <TableSkeleton columns={3} /> : items.length === 0 ? <p className="py-16 text-center text-[#919191]">No notifications yet.</p> : items.map((item) => (
                        <button key={item._id} type="button" onClick={() => openItem(item)} className={`flex w-full items-start gap-3 border-b border-[#222] px-5 py-4 text-left hover:bg-[#1A1A1A] ${item.isRead ? "" : "bg-[#86efac]/5"}`}>
                            <span className={`mt-2 h-2 w-2 flex-none rounded-full ${item.isRead ? "bg-transparent" : "bg-[#86efac]"}`} />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white">{item.title}</p>
                                <p className="text-sm text-[#919191]">{item.body}</p>
                            </div>
                            <span className="flex-none text-xs text-[#666]">{timeAgo(item.createdAt)}</span>
                        </button>
                    ))}
                </CardContent>
            </Card>
            <div className="flex justify-between">
                <Button variant="outline" disabled={page === 1 || loading} onClick={() => load(page - 1)} className="border-[#333] bg-[#0D0D0D] text-white">Previous</Button>
                <Button variant="outline" disabled={!hasNext || loading} onClick={() => load(page + 1)} className="border-[#333] bg-[#0D0D0D] text-white">Next</Button>
            </div>
        </div>
    )
}

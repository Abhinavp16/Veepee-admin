"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, BellRing, CheckCheck } from "lucide-react"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiFetch } from "@/lib/api"
import { enableWebPush, isWebPushConfigured, listenForForegroundPush, webPushPermission } from "@/lib/web-push"

export interface TeamNotification {
    _id: string
    type: string
    title: string
    body: string
    link: string
    isRead: boolean
    createdAt: string
}

export function timeAgo(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} h ago`
    return new Date(iso).toLocaleDateString()
}

export function NotificationBell() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<TeamNotification[]>([])
    const [unread, setUnread] = useState(0)
    const [permission, setPermission] = useState(webPushPermission())

    const load = useCallback(async () => {
        try {
            const response = await apiFetch("/admin/notifications?limit=10")
            if (!response.ok) return
            const body = await response.json()
            setItems(body.data || [])
            setUnread(body.unreadCount || 0)
        } catch { /* The next poll will try again. */ }
    }, [])

    useEffect(() => {
        void load()
        const timer = setInterval(load, 60000)
        const onFocus = () => void load()
        window.addEventListener("focus", onFocus)
        return () => { clearInterval(timer); window.removeEventListener("focus", onFocus) }
    }, [load])

    // Pushes that arrive while the panel is open show as a toast and refresh the list.
    useEffect(() => {
        let stop: (() => void) | undefined
        void listenForForegroundPush((title, body) => { toast(title, { description: body }); void load() }).then((unsubscribe) => { stop = unsubscribe })
        return () => stop?.()
    }, [load, permission])

    async function markRead(ids?: string[]) {
        const response = await apiFetch("/admin/notifications/mark-read", { method: "POST", body: JSON.stringify(ids ? { ids } : {}) })
        if (response.ok) void load()
    }

    async function openItem(item: TeamNotification) {
        if (!item.isRead) await markRead([item._id])
        setOpen(false)
        router.push(item.link || "/")
    }

    async function turnOnBrowserNotifications() {
        const result = await enableWebPush()
        setPermission(webPushPermission())
        if (result === "enabled") toast.success("Browser notifications are on")
        else if (result === "denied") toast.error("Notifications are blocked in this browser")
        else toast.error("Could not turn on browser notifications")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type="button" className="relative rounded-full border border-[#333] p-2 text-[#bdbdbd] transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[#86efac]/50" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                    <Bell className="h-5 w-5" />
                    {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#86efac] px-1 text-[11px] font-bold text-black">{unread > 99 ? "99+" : unread}</span>}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,22rem)] border-[#1F1F1F] bg-[#0D0D0D] p-0 text-white">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] px-4 py-3">
                    <p className="text-sm font-bold">Notifications</p>
                    <button type="button" disabled={unread === 0} onClick={() => markRead()} className="flex items-center gap-1 text-xs text-[#86efac] disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-[#919191]">Nothing new yet.</p>}
                    {items.map((item) => (
                        <button key={item._id} type="button" onClick={() => openItem(item)} className={`block w-full border-b border-[#1F1F1F] px-4 py-3 text-left hover:bg-[#161616] ${item.isRead ? "" : "bg-[#86efac]/5"}`}>
                            <div className="flex items-start gap-2">
                                {!item.isRead && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[#86efac]" />}
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{item.title}</p>
                                    <p className="line-clamp-2 text-xs text-[#919191]">{item.body}</p>
                                    <p className="mt-1 text-[11px] text-[#666]">{timeAgo(item.createdAt)}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="space-y-2 px-4 py-3">
                    {isWebPushConfigured() && permission === "default" && (
                        <button type="button" onClick={turnOnBrowserNotifications} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#333] py-2 text-xs text-white hover:bg-[#161616]"><BellRing className="h-3.5 w-3.5" />Turn on browser notifications</button>
                    )}
                    <Link href="/notifications" onClick={() => setOpen(false)} className="block text-center text-xs text-[#86efac]">View all notifications</Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}

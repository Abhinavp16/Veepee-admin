"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { PENDING_UPGRADES_CHANGED } from "@/lib/wholesaler-applications"

/**
 * How many wholesaler applications are waiting (administrators only; 0 for
 * staff). Refreshed every minute, when the window gets focus, and right
 * after an application is accepted or rejected, like the notification bell.
 */
export function usePendingUpgradesCount(enabled: boolean): number {
    const [count, setCount] = useState(0)

    const load = useCallback(async () => {
        try {
            const response = await apiFetch("/admin/wholesaler-applications?status=pending&limit=1")
            if (!response.ok) return
            const body = await response.json()
            const pending = Number(body?.counts?.pending)
            if (Number.isFinite(pending)) setCount(pending)
        } catch { /* The next refresh will try again. */ }
    }, [])

    useEffect(() => {
        if (!enabled) {
            setCount(0)
            return
        }
        void load()
        // The minute poll skips while the tab is hidden; coming back refreshes.
        const timer = setInterval(() => { if (document.visibilityState !== "hidden") void load() }, 60000)
        const refresh = () => void load()
        const onVisible = () => { if (document.visibilityState === "visible") void load() }
        window.addEventListener("focus", refresh)
        window.addEventListener(PENDING_UPGRADES_CHANGED, refresh)
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            clearInterval(timer)
            window.removeEventListener("focus", refresh)
            window.removeEventListener(PENDING_UPGRADES_CHANGED, refresh)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [enabled, load])

    return count
}

/** The small count pill on a sidebar link; nothing when 0. */
export function CountPill({ count, label, className = "" }: { count: number; label: string; className?: string }) {
    if (count <= 0) return null
    return (
        <span className={`sidebar-count-pill ${className}`}>
            <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
            <span className="sr-only">{`, ${count} ${label}`}</span>
        </span>
    )
}

/** A dot with the count for the sidebar's icon-only mode. */
export function CountDot({ count, label, className = "" }: { count: number; label: string; className?: string }) {
    if (count <= 0) return null
    return (
        <span className={`sidebar-count-dot ${className}`}>
            <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
            <span className="sr-only">{`, ${count} ${label}`}</span>
        </span>
    )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch } from "@/lib/api"

/** Fired when Leads is opened, so the menu count clears at once. */
export const LEADS_SEEN = "veepee:leads-seen"

/** A lead is new (green dot) for this long after their latest view. */
export const NEW_LEAD_DAYS = 2

export interface NewLeadsInfo {
    /** People who became leads in the last 2 days and aren't contacted. */
    newLeads: number
    /** Of those, the ones since this administrator last opened Leads. */
    unseen: number
}

export async function fetchNewLeads(): Promise<NewLeadsInfo | null> {
    try {
        const res = await apiFetch("/admin/analytics/potential-customers/new")
        if (!res.ok) return null
        const body = await res.json()
        const newLeads = Number(body?.data?.newLeads)
        const unseen = Number(body?.data?.unseen)
        return Number.isFinite(newLeads) && Number.isFinite(unseen) ? { newLeads, unseen } : null
    } catch {
        return null
    }
}

/** Opened Leads now: the menu count starts again from here. */
export async function markLeadsSeen(): Promise<void> {
    try {
        await apiFetch("/admin/analytics/potential-customers/seen", { method: "POST" })
    } catch { /* The next visit marks it. */ }
    if (typeof window !== "undefined") window.dispatchEvent(new Event(LEADS_SEEN))
}

/**
 * New leads since this administrator last opened Leads (administrators only;
 * 0 for staff). Refreshed every 2 minutes, when the window gets focus, and
 * right after Leads is opened.
 */
export function useNewLeadsCount(enabled: boolean): number {
    const [count, setCount] = useState(0)
    // Only the latest answer counts (an older one can arrive after "seen").
    const requestRef = useRef(0)

    const load = useCallback(async () => {
        const request = ++requestRef.current
        const info = await fetchNewLeads()
        if (info && request === requestRef.current) setCount(info.unseen)
    }, [])

    useEffect(() => {
        if (!enabled) {
            setCount(0)
            return
        }
        void load()
        const timer = setInterval(() => { if (document.visibilityState !== "hidden") void load() }, 120000)
        const refresh = () => void load()
        const onVisible = () => { if (document.visibilityState === "visible") void load() }
        window.addEventListener("focus", refresh)
        window.addEventListener(LEADS_SEEN, refresh)
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            clearInterval(timer)
            window.removeEventListener("focus", refresh)
            window.removeEventListener(LEADS_SEEN, refresh)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [enabled, load])

    return count
}

/** The green dot and "New" tag on a lead from the last 2 days. */
export function NewLeadTag() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#86efac] bg-[#86efac]/15" title={`Became a lead in the last ${NEW_LEAD_DAYS} days`}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#86efac]" aria-hidden="true" />
            New
        </span>
    )
}

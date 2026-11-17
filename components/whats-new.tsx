"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCheck, Sparkles } from "lucide-react"
import { useDashboardUser } from "@/components/dashboard-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { currentWhatsNew, whatsNew, type WhatsNewEntry } from "@/lib/whats-new"

// "What's new": new admin features stay highlighted until this staff member
// has seen them. Seen ids are saved on their account (GET/POST
// /admin/whats-new/seen), so they clear on every device. Entries live in
// lib/whats-new.ts.

interface WhatsNewValue {
  /** True once the seen list has loaded; nothing counts as new before. */
  ready: boolean
  /** Features this person hasn't seen yet (their role, within 30 days). */
  unseen: WhatsNewEntry[]
  isNew: (id: string) => boolean
  /** True when an unseen feature lives behind this sidebar link. */
  isNewAt: (href: string) => boolean
  markSeen: (ids: string[]) => void
}

const WhatsNewContext = createContext<WhatsNewValue>({
  ready: false,
  unseen: [],
  isNew: () => false,
  isNewAt: () => false,
  markSeen: () => {},
})

export function useWhatsNew() {
  return useContext(WhatsNewContext)
}

export function WhatsNewProvider({ children }: { children: React.ReactNode }) {
  const role = useDashboardUser()?.role
  // Fixed for the visit, so an entry doesn't vanish mid-page at midnight.
  const [now] = useState(() => Date.now())
  const candidates = useMemo(() => (role ? currentWhatsNew(role, now) : []), [role, now])
  const [seen, setSeen] = useState<Set<string> | null>(null)

  // If the list can't be loaded, nothing shows as new (better than every
  // feature flashing forever).
  useEffect(() => {
    if (!candidates.length) return
    let cancelled = false
    void (async () => {
      try {
        const response = await apiFetch("/admin/whats-new/seen")
        if (!response.ok) return
        const body = await response.json()
        const ids: unknown = body?.data?.ids
        if (!cancelled && Array.isArray(ids)) setSeen(new Set(ids.filter((id): id is string => typeof id === "string")))
      } catch { /* Nothing shows as new. */ }
    })()
    return () => { cancelled = true }
  }, [candidates])

  const unseen = useMemo(() => (seen ? candidates.filter((entry) => !seen.has(entry.id)) : []), [candidates, seen])

  const isNew = useCallback((id: string) => unseen.some((entry) => entry.id === id), [unseen])
  const isNewAt = useCallback((href: string) => unseen.some((entry) => entry.navHref === href), [unseen])

  // Shown as seen at once; if saving fails it simply shows again next visit.
  const markSeen = useCallback((ids: string[]) => {
    const fresh = ids.filter((id) => whatsNew.some((entry) => entry.id === id) && !seen?.has(id))
    if (!seen || !fresh.length) return
    setSeen((current) => new Set([...(current ?? []), ...fresh]))
    void apiFetch("/admin/whats-new/seen", { method: "POST", body: JSON.stringify({ ids: fresh }) }).catch(() => {})
  }, [seen])

  const value = useMemo<WhatsNewValue>(() => ({ ready: seen !== null, unseen, isNew, isNewAt, markSeen }), [seen, unseen, isNew, isNewAt, markSeen])
  return <WhatsNewContext.Provider value={value}>{children}</WhatsNewContext.Provider>
}

/** The small green "NEW" label. */
export function NewPill({ className }: { className?: string }) {
  return <span className={cn("whats-new-pill", className)}>New</span>
}

/** A green dot for the sidebar's icon-only mode. */
export function NewDot({ className }: { className?: string }) {
  return <span className={cn("whats-new-dot", className)}><span className="sr-only">New</span></span>
}

export interface NewOnPage {
  id: string
  /** Was new when the page opened; stays true for this visit. */
  isNew: boolean
  hint: string
  /** Ends the highlight for this visit ("Got it"). */
  dismiss: () => void
}

/**
 * For the page a feature lives on: remembers whether it was new when the page
 * opened (so the highlight stays for this visit), and marks it as seen so the
 * sidebar pill and header count clear.
 */
export function useNewOnPage(id: string): NewOnPage {
  const { ready, isNew, markSeen } = useWhatsNew()
  const [wasNew, setWasNew] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (!ready || checked.current) return
    checked.current = true
    if (isNew(id)) {
      setWasNew(true)
      markSeen([id])
    }
  }, [ready, id, isNew, markSeen])

  const dismiss = useCallback(() => setWasNew(false), [])
  const hint = whatsNew.find((entry) => entry.id === id)?.hint ?? ""
  return { id, isNew: wasNew, hint, dismiss }
}

/** "New here: …" row with a Got it button. */
export function NewFeatureHint({ feature, className }: { feature: NewOnPage; className?: string }) {
  if (!feature.isNew || !feature.hint) return null
  return <div className={cn("whats-new-hint flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm", className)} role="note">
    <p className="flex min-w-0 items-center gap-2"><Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" /><span><span className="font-semibold">New here:</span> {feature.hint}</span></p>
    <button type="button" onClick={feature.dismiss} className="whats-new-hint-button rounded-md px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#86efac]/50">Got it</button>
  </div>
}

/** Header button and panel; shown only while something is unseen. */
export function WhatsNewButton() {
  const { unseen, markSeen } = useWhatsNew()
  const [open, setOpen] = useState(false)
  if (!unseen.length) return null
  const count = unseen.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="whats-new-button relative flex items-center gap-1.5 rounded-full border px-2.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#86efac]/50" aria-label={`What's new, ${count} new ${count === 1 ? "feature" : "features"}`}>
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <span className="hidden md:inline">What&apos;s new</span>
          <span className="whats-new-count flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold" aria-hidden="true">{count}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] border-[#1F1F1F] bg-[#0D0D0D] p-0 text-white">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] px-4 py-3">
          <p className="text-sm font-bold">What&apos;s new in the admin</p>
          <button type="button" onClick={() => { markSeen(unseen.map((entry) => entry.id)); setOpen(false) }} className="flex items-center gap-1 rounded text-xs text-[#86efac] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50"><CheckCheck className="h-3.5 w-3.5" />Mark all as seen</button>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {unseen.map((entry) => (
            <li key={entry.id} className="border-b border-[#1F1F1F] px-4 py-3 last:border-b-0">
              <p className="flex items-center gap-2 text-sm font-semibold">{entry.title}<NewPill /></p>
              <p className="mt-0.5 text-xs text-[#919191]">{entry.body}</p>
              <Link href={entry.href} onClick={() => setOpen(false)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#86efac] hover:underline">{entry.linkLabel}<ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

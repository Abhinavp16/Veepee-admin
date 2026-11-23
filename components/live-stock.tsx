"use client"

// Price Management's live, editable stock: each row's stock refreshes while
// the page is open, can be typed or stepped with − / +, and is saved only if
// it is still the number the admin started from (an order may have changed
// it meanwhile; the server refuses then and nothing is overwritten).

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface StockProduct { _id: string; name: string; stock: number; lowStockThreshold?: number }

export const STOCK_REASONS = ["Count correction", "New stock arrived", "Damaged / lost", "Returned by customer"] as const

/** How often the stock on screen refreshes. */
const REFRESH_MS = 20_000
/** How long "just updated · was N" stays on a row. */
const FLASH_MS = 6_000
const DEFAULT_LOW = 5

interface Draft {
  /** What the admin typed (may be empty or invalid while typing). */
  value: string
  reason: string
  /** The stock when they started editing: sent so a change meanwhile is caught. */
  base: number
}

interface Conflict { product: StockProduct; wanted: number; current: number; reason: string }

function parseStock(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const n = Number(value)
  return Number.isSafeInteger(n) ? n : null
}

export function useLiveStock<P extends StockProduct>(products: P[], setProducts: (update: (current: P[]) => P[]) => void) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  // Stock changed on the server while that row was being edited.
  const [liveNotes, setLiveNotes] = useState<Record<string, number>>({})
  // Rows the refresh just changed: the stock before.
  const [flashes, setFlashes] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savingAll, setSavingAll] = useState(false)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const productsRef = useRef(products)
  productsRef.current = products
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Rows being saved right now (read synchronously, so a second save of the
  // same row can't start).
  const savingRef = useRef<Record<string, boolean>>({})
  // Each refresh and each save bumps this; a refresh that answers after a
  // newer one (or after a save) is out of date and dropped.
  const refreshSeq = useRef(0)
  const lastRefreshAt = useRef(0)

  const ids = products.map((p) => p._id).join(",")

  const refresh = useCallback(async () => {
    if (!ids) return
    // Focus and visibilitychange usually fire together: one refresh is enough.
    if (Date.now() - lastRefreshAt.current < 1_000) return
    lastRefreshAt.current = Date.now()
    const seq = ++refreshSeq.current
    try {
      const response = await apiFetch(`/admin/products/stock-snapshot?ids=${encodeURIComponent(ids)}`)
      if (!response.ok || seq !== refreshSeq.current) return
      const body = await response.json()
      if (seq !== refreshSeq.current) return
      const fresh = new Map<string, { stock: number; lowStockThreshold?: number }>(
        (body.data || []).map((p: { _id: string; stock: number; lowStockThreshold?: number }) => [String(p._id), p]),
      )
      const changed: Array<[string, number, number]> = []
      for (const product of productsRef.current) {
        const next = fresh.get(product._id)
        if (next && next.stock !== product.stock && !savingRef.current[product._id]) changed.push([product._id, product.stock, next.stock])
      }
      setUpdatedAt(Date.now())
      if (!changed.length) return
      const changedIds = new Map(changed.map(([id, , stock]) => [id, stock]))
      setProducts((current) => current.map((p) => {
        const stock = changedIds.get(p._id)
        return stock === undefined ? p : { ...p, stock, lowStockThreshold: fresh.get(p._id)?.lowStockThreshold ?? p.lowStockThreshold }
      }))
      const editing = draftsRef.current
      setLiveNotes((notes) => {
        const out = { ...notes }
        for (const [id, , stock] of changed) if (editing[id]) out[id] = stock
        return out
      })
      const flashed = changed.filter(([id]) => !editing[id])
      setFlashes((current) => ({ ...current, ...Object.fromEntries(flashed.map(([id, before]) => [id, before])) }))
      for (const [id] of flashed) {
        clearTimeout(flashTimers.current[id])
        flashTimers.current[id] = setTimeout(() => setFlashes((f) => {
          const rest = { ...f }
          delete rest[id]
          return rest
        }), FLASH_MS)
      }
    } catch {
      // Offline for a moment: the next refresh tries again.
    }
  }, [ids, setProducts])

  // Refresh every 20 s while the page is visible, and on coming back to it.
  useEffect(() => {
    if (!ids) return
    setUpdatedAt(Date.now())
    const tick = () => { if (document.visibilityState === "visible") void refresh() }
    const timer = setInterval(tick, REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === "visible") void refresh() }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [ids, refresh])

  // "updated 10s ago" ticks along.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => () => { Object.values(flashTimers.current).forEach(clearTimeout) }, [])

  // A different page or category: forget edits for rows no longer shown.
  useEffect(() => {
    const shown = new Set(ids.split(","))
    const keep = <T,>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([id]) => shown.has(id)))
    setDrafts((d) => keep(d))
    setLiveNotes((n) => keep(n))
  }, [ids])

  const productById = (id: string) => productsRef.current.find((p) => p._id === id)

  const setValue = (product: StockProduct, value: string) => {
    setDrafts((current) => {
      const existing = current[product._id]
      const base = existing?.base ?? product.stock
      // Back to the number they started from: only when nothing changed on the
      // server meanwhile does the edit simply end (otherwise keep it, so the
      // note and the new number aren't lost).
      if (value.trim() === String(base) && !existing?.reason && base === product.stock) {
        const rest = { ...current }
        delete rest[product._id]
        return rest
      }
      return { ...current, [product._id]: { value, reason: existing?.reason ?? "", base } }
    })
    setFlashes((f) => {
      if (!(product._id in f)) return f
      const rest = { ...f }
      delete rest[product._id]
      return rest
    })
  }

  const step = (product: StockProduct, by: number) => {
    const draft = drafts[product._id]
    const current = draft ? parseStock(draft.value) ?? draft.base : product.stock
    setValue(product, String(Math.max(0, current + by)))
  }

  const setReason = (id: string, reason: string) =>
    setDrafts((current) => current[id] ? { ...current, [id]: { ...current[id], reason } } : current)

  const undo = (id: string) => {
    setDrafts((current) => {
      const rest = { ...current }
      delete rest[id]
      return rest
    })
    setLiveNotes((notes) => {
      const rest = { ...notes }
      delete rest[id]
      return rest
    })
  }

  const undoAll = () => { setDrafts({}); setLiveNotes({}) }

  /**
   * Saves one row: "saved", "unchanged" (it matched already), "busy" (this
   * row is already being saved) or "failed". With [quiet] (Save all) a
   * refusal because stock changed puts the "Stock is now N" note on the row
   * instead of opening the dialog.
   */
  const save = async (id: string, options?: { expected?: number; quiet?: boolean }): Promise<"saved" | "unchanged" | "busy" | "failed"> => {
    if (savingRef.current[id]) return "busy"
    const product = productById(id)
    const draft = draftsRef.current[id]
    if (!product || !draft) return "failed"
    const wanted = parseStock(draft.value)
    if (wanted === null) {
      if (!options?.quiet) toast.error(`Enter a whole number of 0 or more for ${product.name}`)
      return "failed"
    }
    const expected = options?.expected ?? draft.base
    if (wanted === expected) { undo(id); return "unchanged" }
    savingRef.current[id] = true
    setSaving((s) => ({ ...s, [id]: true }))
    refreshSeq.current += 1 // a refresh already on its way is now out of date
    try {
      const response = await apiFetch(`/admin/products/${id}/stock`, {
        method: "PUT",
        body: JSON.stringify({ stock: wanted, expectedStock: expected, reason: draft.reason || "Count correction" }),
      })
      const body = await response.json().catch(() => ({}))
      if (response.status === 409 && body?.error?.code === "STOCK_CHANGED") {
        const current = Number(body.error.details?.currentStock)
        if (Number.isSafeInteger(current)) {
          setProducts((list) => list.map((p) => p._id === id ? { ...p, stock: current } : p))
          if (options?.quiet) setLiveNotes((notes) => ({ ...notes, [id]: current }))
          else setConflict({ product: { ...product, stock: current }, wanted, current, reason: draft.reason })
        } else if (!options?.quiet) toast.error(body?.message || "Stock changed meanwhile. Check it again.")
        return "failed"
      }
      if (!response.ok) throw new Error(body?.message || "Unable to save stock")
      const saved = Number(body.data?.newStock)
      refreshSeq.current += 1
      setProducts((list) => list.map((p) => p._id === id ? { ...p, stock: Number.isFinite(saved) ? saved : wanted } : p))
      undo(id)
      if (!options?.quiet) toast.success(`${product.name}: stock ${expected} → ${wanted}`)
      return "saved"
    } catch (error) {
      if (!options?.quiet) toast.error(error instanceof Error ? error.message : "Unable to save stock")
      return "failed"
    } finally {
      delete savingRef.current[id]
      setSaving((s) => {
        const rest = { ...s }
        delete rest[id]
        return rest
      })
    }
  }

  const saveAll = async () => {
    const ids = Object.keys(draftsRef.current)
    if (!ids.length) return
    setSavingAll(true)
    let saved = 0
    const flagged: string[] = []
    for (const id of ids) {
      if (!draftsRef.current[id]) continue // undone meanwhile
      const result = await save(id, { quiet: true })
      if (result === "saved") saved += 1
      else if (result === "failed") flagged.push(productById(id)?.name || id)
    }
    setSavingAll(false)
    if (saved) toast.success(`${saved} stock ${saved === 1 ? "change" : "changes"} saved`)
    if (flagged.length) toast.error(`Not saved, check these: ${flagged.join(", ")}`)
  }

  /**
   * After a refusal: "keep" the stock as it is now, "set" the typed number
   * anyway, or "dismiss" (close the box and keep editing, with the note).
   */
  const resolveConflict = async (choice: "keep" | "set" | "dismiss") => {
    if (!conflict) return
    const { product, current, wanted } = conflict
    setConflict(null)
    if (choice === "dismiss") { setLiveNotes((notes) => ({ ...notes, [product._id]: current })); return }
    if (choice === "keep") { undo(product._id); return }
    setDrafts((d) => ({ ...d, [product._id]: { ...(d[product._id] || { reason: conflict.reason }), value: String(wanted), base: current } }))
    draftsRef.current = { ...draftsRef.current, [product._id]: { value: String(wanted), reason: conflict.reason, base: current } }
    setLiveNotes((n) => {
      const rest = { ...n }
      delete rest[product._id]
      return rest
    })
    await save(product._id, { expected: current })
  }

  const secondsAgo = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null

  return { drafts, liveNotes, flashes, saving, savingAll, conflict, secondsAgo, setValue, step, setReason, undo, undoAll, save, saveAll, resolveConflict }
}

type LiveStock = ReturnType<typeof useLiveStock>

/** "● Live stock · updated 10s ago". */
export function LiveStockBadge({ secondsAgo }: { secondsAgo: number | null }) {
  return <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#86efac]/35 bg-[#86efac]/5 px-3 text-xs font-semibold text-[#d1fae5]">
    <span className="live-stock-dot h-2 w-2 rounded-full bg-[#86efac]" aria-hidden="true" />
    Live stock{secondsAgo === null ? "" : secondsAgo < 5 ? " · updated just now" : ` · updated ${secondsAgo}s ago`}
  </span>
}

/** One row's stock: − [number] +, with the change, reason, Save and Undo. */
export function StockCell({ product, live }: { product: StockProduct; live: LiveStock }) {
  const draft = live.drafts[product._id]
  const value = draft ? draft.value : String(product.stock)
  const parsed = parseStock(value)
  const base = draft?.base ?? product.stock
  const changed = !!draft && parsed !== null && parsed !== base
  const invalid = !!draft && parsed === null
  const saving = !!live.saving[product._id]
  const shown = parsed ?? base
  const low = product.lowStockThreshold ?? DEFAULT_LOW
  const note = live.liveNotes[product._id]
  const flash = live.flashes[product._id]
  const diff = changed ? (parsed as number) - base : 0
  const tone = diff < 0 ? "text-amber-300" : "text-[#86efac]"
  const frame = invalid ? "border-red-500" : changed ? (diff < 0 ? "border-amber-300" : "border-[#86efac]") : shown === 0 ? "border-red-900" : "border-[#333]"

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && changed) { event.preventDefault(); void live.save(product._id) }
    if (event.key === "Escape" && draft) { event.preventDefault(); live.undo(product._id) }
    if (event.key === "ArrowUp") { event.preventDefault(); live.step(product, 1) }
    if (event.key === "ArrowDown") { event.preventDefault(); live.step(product, -1) }
  }

  return <div className="flex min-w-[240px] flex-col gap-2">
    <div className="flex flex-wrap items-center gap-2">
      <div className={`flex items-center overflow-hidden rounded-lg border ${frame} ${flash !== undefined ? "bg-[#86efac]/10" : "bg-[#0D0D0D]"} transition-colors`}>
        <button type="button" onClick={() => live.step(product, -1)} disabled={saving || shown <= 0} aria-label={`One less ${product.name}`} className="flex h-9 w-8 items-center justify-center text-lg text-gray-300 hover:bg-[#262626] disabled:text-gray-600">−</button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(event) => live.setValue(product, event.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={onKey}
          disabled={saving}
          aria-label={`Stock for ${product.name}`}
          aria-invalid={invalid || undefined}
          className={`h-9 w-14 border-x border-[#262626] bg-transparent text-center text-sm font-bold outline-none focus-visible:bg-[#1a1a1a] ${shown === 0 && !changed ? "text-red-400" : "text-white"}`}
        />
        <button type="button" onClick={() => live.step(product, 1)} disabled={saving} aria-label={`One more ${product.name}`} className="flex h-9 w-8 items-center justify-center text-lg text-gray-300 hover:bg-[#262626] disabled:text-gray-600">+</button>
      </div>
      {saving ? <span className="flex items-center gap-1 text-xs text-gray-400"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
        : changed ? <span className="text-xs text-gray-400">{base} → <strong className={tone}>{parsed}</strong> <span className={tone}>({diff > 0 ? "+" : "−"}{Math.abs(diff)})</span></span>
        : invalid ? <span className="text-xs text-red-400">Enter a number</span>
        : flash !== undefined ? <span className="text-xs text-[#86efac]">just updated · was {flash}</span>
        : shown === 0 ? <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-300">Out of stock</span>
        : shown <= low ? <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">Low</span>
        : null}
    </div>
    {note !== undefined && draft && <p className="max-w-[260px] rounded-md border border-sky-400/30 bg-sky-400/5 px-2 py-1.5 text-xs text-sky-200" role="status">
      Stock is now <strong>{note}</strong>{note < base ? ` (an order took ${base - note})` : ""}. Your {value} is kept; check it, then Save.
    </p>}
    {draft && !saving && <div className="flex flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor={`reason-${product._id}`}>Reason for the stock change of {product.name}</label>
      <select id={`reason-${product._id}`} value={draft.reason || STOCK_REASONS[0]} onChange={(event) => live.setReason(product._id, event.target.value)} className="h-8 rounded-md border border-[#333] bg-[#0D0D0D] px-1.5 text-xs text-gray-200">
        {STOCK_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
      </select>
      <Button type="button" size="sm" onClick={() => void live.save(product._id)} disabled={!changed || live.savingAll} className="h-8 bg-[#86efac] px-2.5 text-xs font-bold text-black hover:bg-[#86efac]/90">✓ Save</Button>
      <Button type="button" size="sm" variant="outline" onClick={() => live.undo(product._id)} className="h-8 border-[#333] px-2.5 text-xs text-gray-200 hover:bg-[#262626]">↺ Undo</Button>
    </div>}
  </div>
}

/** "2 stock changes not saved · Undo all · Save all", along the bottom. */
export function StockChangesBar({ products, live }: { products: StockProduct[]; live: LiveStock }) {
  const entries = Object.entries(live.drafts)
    .map(([id, draft]) => {
      const product = products.find((p) => p._id === id)
      const wanted = parseStock(draft.value)
      return product && wanted !== null && wanted !== draft.base ? { name: product.name, diff: wanted - draft.base } : null
    })
    .filter(Boolean) as Array<{ name: string; diff: number }>
  if (!entries.length) return null
  const summary = entries.slice(0, 3).map((e) => `${e.name} ${e.diff > 0 ? "+" : "−"}${Math.abs(e.diff)}`).join(", ") + (entries.length > 3 ? ` and ${entries.length - 3} more` : "")
  return <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-[#333] bg-[#121212] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]" role="region" aria-label="Unsaved stock changes">
    <p className="min-w-0 flex-1 text-sm font-semibold text-white">{entries.length} stock {entries.length === 1 ? "change" : "changes"} not saved <span className="font-normal text-gray-400">· {summary}</span></p>
    <Button type="button" variant="outline" onClick={live.undoAll} disabled={live.savingAll} className="border-[#333] text-white hover:bg-[#262626]">Undo all</Button>
    <Button type="button" onClick={() => void live.saveAll()} disabled={live.savingAll} className="bg-[#86efac] font-bold text-black hover:bg-[#86efac]/90">{live.savingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save all</Button>
  </div>
}

/** Shown when a save was refused because the stock changed meanwhile. */
export function StockConflictDialog({ live }: { live: LiveStock }) {
  const conflict = live.conflict
  return <Dialog open={!!conflict} onOpenChange={(open) => { if (!open) void live.resolveConflict("dismiss") }}>
    <DialogContent className="border-[#333] bg-[#161616] text-white">
      <DialogHeader>
        <DialogTitle>Stock changed while you were editing</DialogTitle>
        <DialogDescription className="text-gray-300">
          {conflict && <>{conflict.product.name} is now <strong className="text-white">{conflict.current}</strong> (an order or another admin changed it). Nothing was saved.</>}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => void live.resolveConflict("keep")} className="border-[#333] text-white hover:bg-[#262626]">Keep {conflict?.current}</Button>
        <Button type="button" onClick={() => void live.resolveConflict("set")} className="bg-[#86efac] font-bold text-black hover:bg-[#86efac]/90">Set to {conflict?.wanted} anyway</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

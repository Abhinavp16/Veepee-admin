"use client"

import { useState } from "react"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MAX_PICKS = 4

/** Tidies a list the way the server does: 0.5–50, distinct, largest first, at most four. */
export function tidyPicks(list: unknown[]): number[] {
    const picks = [...new Set(
        list.map(Number).filter((n) => Number.isFinite(n) && n >= 0.5 && n <= 50).map((n) => Math.round(n * 100) / 100)
    )]
    return picks.sort((a, b) => b - a).slice(0, MAX_PICKS)
}

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`

/**
 * The "2% off" quick picks wholesalers see on the bulk-negotiation price
 * step: chips with a remove button, and a box to add one.
 */
export function NegotiationPicksInput({
    value,
    onChange,
    maxDiscountPercent,
}: {
    value: number[]
    onChange: (next: number[]) => void
    maxDiscountPercent: number
}) {
    const [draft, setDraft] = useState("")
    const [error, setError] = useState("")
    const picks = tidyPicks(value || [])

    function add() {
        const n = Number(draft)
        if (!Number.isFinite(n) || n < 0.5 || n > 50) {
            setError("Enter a percentage between 0.5 and 50")
            return
        }
        if (picks.includes(n)) {
            setError(`${n}% is already there`)
            return
        }
        if (picks.length >= MAX_PICKS) {
            setError(`At most ${MAX_PICKS} quick picks`)
            return
        }
        if (n > maxDiscountPercent) {
            setError(`Above the ${maxDiscountPercent}% limit below: wholesalers could not send it`)
            return
        }
        onChange(tidyPicks([...picks, n]))
        setDraft("")
        setError("")
    }

    const example = 1000
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {picks.length === 0 && (
                    <span className="text-sm text-gray-400">No quick picks: wholesalers only type a price.</span>
                )}
                {picks.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1 text-sm font-semibold text-[#fbbf24]">
                        {p}% off
                        <button
                            type="button"
                            aria-label={`Remove ${p}%`}
                            onClick={() => onChange(picks.filter((x) => x !== p))}
                            className="rounded-full p-0.5 hover:bg-white/10"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </span>
                ))}
            </div>
            {picks.length < MAX_PICKS && (
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        step="0.5"
                        min={0.5}
                        max={50}
                        placeholder="e.g. 3"
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); setError("") }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
                        className="w-32 bg-[#0D0D0D] border-[#333] text-white"
                    />
                    <span className="text-gray-400 text-sm">% off</span>
                    <Button type="button" variant="outline" size="sm" onClick={add} className="border-[#333] text-white">
                        <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <p className="text-xs text-gray-400">
                On a {money(example)} product:{" "}
                {picks.length > 0
                    ? picks.map((p) => `${money(example * (1 - p / 100))} (${p}% off)`).join(" · ")
                    : "no buttons"}
                {" · "}lowest a wholesaler can ask: {money(Math.ceil(example * (1 - maxDiscountPercent / 100)))}
            </p>
        </div>
    )
}

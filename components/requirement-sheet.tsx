"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, Send, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { apiFetch } from "@/lib/api"

interface RequirementLine {
    id: string
    negotiationNumber: string
    product: { id: string; name: string }
    quantity: number
    requestedPricePerUnit: number
    currentPricePerUnit: number
    currentTotalPrice: number
    status: string
    currentOfferBy: "wholesaler" | "admin"
}

interface Requirement {
    requestGroup: { id: string; number: string }
    status: string
    productCount: number
    totalPrice: number
    canPay: boolean
    waitingOn: "wholesaler" | "dealer" | null
    items: RequirementLine[]
}

const STATUS_STYLE: Record<string, string> = {
    pending: "text-yellow-500 border-yellow-500",
    countered: "text-blue-500 border-blue-500",
    accepted: "text-green-500 border-green-500",
    rejected: "text-red-500 border-red-500",
    converted: "text-emerald-400 border-emerald-400",
    expired: "text-gray-500 border-gray-500",
}

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`

// Several products a wholesaler asked for together: answered as one.
export function RequirementSheet({ groupId, onClose, onChanged }: { groupId: string | null; onClose: () => void; onChanged: () => void }) {
    const [requirement, setRequirement] = useState<Requirement | null>(null)
    const [prices, setPrices] = useState<Record<string, string>>({})
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const load = useCallback(async () => {
        if (!groupId) return
        setLoading(true)
        try {
            const response = await apiFetch(`/admin/negotiations/groups/${groupId}`)
            const body = await response.json()
            if (!response.ok) throw new Error(body.message || "Could not load the requirement")
            setRequirement(body.data)
            setPrices(Object.fromEntries(body.data.items.map((item: RequirementLine) => [item.id, String(item.currentPricePerUnit)])))
        } catch (error: any) {
            toast.error(error.message)
            onClose()
        } finally { setLoading(false) }
    }, [groupId, onClose])

    useEffect(() => { setRequirement(null); setMessage(""); void load() }, [load])

    async function respond(action: "accept" | "counter" | "reject") {
        if (!requirement) return
        let body: Record<string, unknown> = { message: message || undefined }
        if (action === "counter") {
            const counters = requirement.items
                .filter((item) => ["pending", "countered"].includes(item.status))
                .map((item) => ({ item, price: Number(prices[item.id]) }))
                .filter(({ item, price }) => Number.isFinite(price) && price > 0 && price !== item.currentPricePerUnit)
                .map(({ item, price }) => ({ negotiationId: item.id, pricePerUnit: price }))
            if (counters.length === 0) { toast.error("Change at least one price to send a counter offer"); return }
            body = { ...body, counters }
        }
        if (action === "reject") {
            const reason = window.prompt("Reason for declining the requirement (the wholesaler sees this):")
            if (!reason) return
            body = { message: reason }
        }
        setSubmitting(true)
        try {
            const response = await apiFetch(`/admin/negotiations/groups/${requirement.requestGroup.id}/${action}`, { method: "PUT", body: JSON.stringify(body) })
            const result = await response.json()
            if (!response.ok) throw new Error(result.message || "Action failed")
            toast.success(result.message)
            onChanged()
            await load()
        } catch (error: any) {
            toast.error(error.message)
        } finally { setSubmitting(false) }
    }

    const open = (requirement?.items || []).filter((item) => ["pending", "countered"].includes(item.status))
    const hasPending = (requirement?.items || []).some((item) => item.status === "pending")

    return (
        <Sheet open={!!groupId} onOpenChange={(value) => { if (!value) onClose() }}>
            <SheetContent className="w-full overflow-y-auto border-[#333] bg-[#161616] text-white sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle className="text-white">{requirement ? `Requirement ${requirement.requestGroup.number}` : "Requirement"}</SheetTitle>
                    <SheetDescription className="text-gray-400">
                        {requirement ? `${requirement.productCount} products · total ${money(requirement.totalPrice)}${requirement.waitingOn ? ` · waiting on the ${requirement.waitingOn}` : ""}` : "Loading…"}
                    </SheetDescription>
                </SheetHeader>
                {loading && !requirement && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#86efac]" /></div>}
                {requirement && (
                    <div className="mt-6 space-y-5">
                        <div className="space-y-3">
                            {requirement.items.map((item) => {
                                const editable = ["pending", "countered"].includes(item.status)
                                return (
                                    <div key={item.id} className="rounded-lg border border-[#333] bg-[#0D0D0D] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{item.quantity} units · asked {money(item.requestedPricePerUnit)} each</p>
                                            </div>
                                            <Badge variant="outline" className={STATUS_STYLE[item.status] || "text-gray-500 border-gray-500"}>{item.status}</Badge>
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            {editable ? (
                                                <>
                                                    <span className="text-xs text-gray-400">Your price</span>
                                                    <Input type="number" min={0} step="0.01" value={prices[item.id] ?? ""} onChange={(event) => setPrices({ ...prices, [item.id]: event.target.value })} className="h-9 w-32 border-[#333] bg-black" />
                                                    <span className="text-xs text-gray-500">= {money((Number(prices[item.id]) || 0) * item.quantity)}</span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-300">{money(item.currentPricePerUnit)} each = {money(item.currentTotalPrice)}</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {open.length > 0 && (
                            <div className="space-y-3 border-t border-[#333] pt-4">
                                <Input placeholder="Message to the wholesaler (optional)" value={message} onChange={(event) => setMessage(event.target.value)} className="border-[#333] bg-black" />
                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={submitting} onClick={() => respond("counter")} className="bg-blue-600 text-white hover:bg-blue-700"><Send className="mr-2 h-4 w-4" />Send counter offer</Button>
                                    <Button disabled={submitting || !hasPending} onClick={() => respond("accept")} className="bg-green-600 text-white hover:bg-green-700"><Check className="mr-2 h-4 w-4" />Accept their offers</Button>
                                    <Button disabled={submitting} onClick={() => respond("reject")} className="bg-red-600 text-white hover:bg-red-700"><X className="mr-2 h-4 w-4" />Decline requirement</Button>
                                </div>
                                <p className="text-xs text-gray-500">Counter offers apply to the lines whose price you changed. The wholesaler pays for the accepted products in one order.</p>
                            </div>
                        )}
                        {requirement.canPay && <p className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">Everything is answered. The wholesaler can now pay for the accepted products in one order.</p>}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}

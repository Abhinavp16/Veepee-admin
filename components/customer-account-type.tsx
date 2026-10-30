"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Building2, History, Loader2, User } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

export type AccountTypeBusinessInfo = {
    businessName?: string | null
    gstNumber?: string | null
    gstIn?: string | null
    status?: string
    verifiedAt?: string | null
    removedAt?: string | null
    removalReason?: string | null
    removalReasonShared?: boolean
}

export type AccountTypeChange = {
    from: string
    to: string
    at: string
    byName?: string
    reason?: string | null
    reasonShared?: boolean
    openNegotiations?: number
}

export type AccountTypeCustomer = {
    _id: string
    name: string
    role: string
    businessInfo?: AccountTypeBusinessInfo | null
    accountTypeHistory?: AccountTypeChange[]
    openNegotiations?: number
}

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null

const roleName = (role: string) => (role === "wholesaler" ? "wholesaler" : "customer")

/**
 * Customer Profile: switch a wholesaler back to a customer, or make a
 * customer a wholesaler. Takes effect on their next tap in the app; orders
 * and open negotiations are left as they are.
 */
export function CustomerAccountType({
    customer,
    onChanged,
}: {
    customer: AccountTypeCustomer
    onChanged: (customer: AccountTypeCustomer & Record<string, unknown>) => void
}) {
    const [confirming, setConfirming] = useState(false)
    const [reason, setReason] = useState("")
    const [shareReason, setShareReason] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const isWholesaler = customer.role === "wholesaler"
    const info = customer.businessInfo || {}
    const gst = info.gstNumber || info.gstIn
    const approvedOn = formatDate(info.verifiedAt)
    const removedOn = info.status === "removed" || info.removedAt ? formatDate(info.removedAt) : null
    const openNegotiations = customer.openNegotiations || 0
    const history = [...(customer.accountTypeHistory || [])].reverse().slice(0, 3)

    function open() {
        setReason("")
        setShareReason(false)
        setConfirming(true)
    }

    async function confirm() {
        setIsSaving(true)
        try {
            const res = await apiFetch(`/admin/customers/${customer._id}/account-type`, {
                method: "PUT",
                body: JSON.stringify({
                    accountType: isWholesaler ? "customer" : "wholesaler",
                    reason: reason.trim(),
                    showReasonToCustomer: shareReason && reason.trim().length > 0,
                }),
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body?.message || "Could not change the account type")
            onChanged(body.data)
            toast.success(body?.message || "Account type changed")
            setConfirming(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not change the account type")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section aria-labelledby="account-type-heading" className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 id="account-type-heading" className="flex items-center gap-2 font-medium">
                        {isWholesaler ? <Building2 className="h-4 w-4 text-purple-300" /> : <User className="h-4 w-4 text-blue-300" />}
                        Account type: {isWholesaler ? "Wholesaler" : "Customer"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                        {isWholesaler
                            ? [info.businessName, gst && `GST ${gst}`, approvedOn && `Approved ${approvedOn}`].filter(Boolean).join(" · ") || "Sees wholesale prices and bulk negotiation."
                            : "Sees customer prices. Make them a wholesaler to show wholesale prices and bulk negotiation."}
                    </p>
                    {openNegotiations > 0 && (
                        <p className="mt-1 text-xs text-amber-300">
                            {openNegotiations} open {openNegotiations === 1 ? "negotiation" : "negotiations"} (see Negotiations)
                        </p>
                    )}
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={open}
                    className={isWholesaler
                        ? "border-red-500/50 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200"
                        : "border-purple-500/50 bg-transparent text-purple-200 hover:bg-purple-500/10 hover:text-purple-100"}
                >
                    {isWholesaler ? "Switch to customer" : "Make wholesaler"}
                </Button>
            </div>

            {!isWholesaler && removedOn && (
                <p className="mt-3 flex items-start gap-2 rounded-md border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-xs text-gray-400">
                    <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        Wholesaler access removed on {removedOn}
                        {info.removalReason ? <>. Reason: <span className="text-gray-300">{info.removalReason}</span>{info.removalReasonShared ? " (shown to the customer)" : " (team only)"}</> : ""}
                        {info.status === "pending" ? ". They have applied again (see Account Upgrades)." : ""}
                    </span>
                </p>
            )}

            {history.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-500">
                    {history.map((change, index) => (
                        <li key={`${change.at}-${index}`}>
                            {formatDate(change.at)}: {roleName(change.from)} → {roleName(change.to)}
                            {change.byName ? ` by ${change.byName}` : ""}
                            {change.reason ? ` · “${change.reason}”` : ""}
                        </li>
                    ))}
                </ul>
            )}

            <AlertDialog open={confirming} onOpenChange={(next) => { if (!isSaving) setConfirming(next) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isWholesaler ? `Switch ${customer.name} to a customer?` : `Make ${customer.name} a wholesaler?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                                <ul className="list-disc space-y-1 pl-5">
                                    {isWholesaler ? (
                                        <>
                                            <li>They see customer prices from their next tap, including items already in their cart.</li>
                                            <li>Bulk negotiation disappears from their app.</li>
                                            {openNegotiations > 0 && (
                                                <li className="font-medium text-amber-700 dark:text-amber-300">
                                                    {openNegotiations} open {openNegotiations === 1 ? "negotiation stays" : "negotiations stay"} open. Handle {openNegotiations === 1 ? "it" : "them"} on the Negotiations page.
                                                </li>
                                            )}
                                            <li>Orders already placed don&apos;t change. Their business details are kept, and they can apply again later.</li>
                                        </>
                                    ) : (
                                        <li>They see wholesale prices and bulk negotiation from their next tap, without applying.</li>
                                    )}
                                    <li>They get a message in the app.</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <label htmlFor="account-type-reason" className="text-sm font-medium">
                            {isWholesaler ? "Reason (optional)" : "Note (optional)"}
                        </label>
                        <Textarea
                            id="account-type-reason"
                            value={reason}
                            maxLength={300}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={isWholesaler ? "e.g. GST not renewed" : "e.g. Long-time dealer"}
                            className="min-h-20 border-[#333] bg-[#0D0D0D] text-white"
                        />
                        {isWholesaler && (
                            <>
                                <label htmlFor="account-type-share" className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                                    <Checkbox
                                        id="account-type-share"
                                        checked={shareReason}
                                        disabled={!reason.trim()}
                                        onCheckedChange={(checked) => setShareReason(checked === true)}
                                    />
                                    Show this reason to the customer
                                </label>
                                {!shareReason && (
                                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <AlertTriangle className="h-3 w-3" /> Only the team sees it.
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={isWholesaler ? "bg-red-600 text-white hover:bg-red-700" : "bg-purple-600 text-white hover:bg-purple-700"}
                            disabled={isSaving}
                            onClick={(event) => { event.preventDefault(); void confirm() }}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isWholesaler ? "Switch to customer" : "Make wholesaler"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    )
}

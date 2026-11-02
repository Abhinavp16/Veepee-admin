"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, KeyRound, Loader2, MessageCircle } from "lucide-react"
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
import { apiFetch } from "@/lib/api"

/** A customer's "forgot password" request from the app, as the server lists it. */
export type ResetRequest = {
    _id: string
    customerId: string | null
    name: string
    phone: string
    role: string
    status: "open" | "expired" | "completed"
    requestedAt: string
    lastRequestedAt: string
    expiresAt: string
    completedAt?: string | null
    completedByName?: string
}

const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })

/** "reset 2 Nov, 6:04 pm by Dev Admin", "not reset (expired)" or "waiting". */
export function requestOutcome(request: ResetRequest) {
    if (request.status === "completed") {
        return `reset ${request.completedAt ? formatDateTime(request.completedAt) : ""}${request.completedByName ? ` by ${request.completedByName}` : ""}`
    }
    return request.status === "expired" ? "not reset (expired)" : "waiting for a reset"
}

// WhatsApp wants the number with its country code and digits only
// ("098765 43210" and "+91 98765 43210" both become 919876543210).
const whatsappNumber = (phone?: string) => {
    const digits = String(phone || "").replace(/\D/g, "").replace(/^0+/, "")
    return digits.length === 10 ? `91${digits}` : digits
}

// A "forgot password" request from the app allows one reset for this long.
const REQUEST_HOURS = 24

/**
 * Customer Profile: forgot password. Only after the customer asks from the
 * app (Forgot Password, Send reset request) and calls or WhatsApps from their
 * registered number: issue a one-time password (24 hours) and share it; the
 * app makes them choose a new password at sign-in.
 */
export function CustomerPasswordReset({
    customer,
    onReset,
}: {
    customer: {
        _id: string
        name: string
        phone?: string
        passwordResetRequestedAt?: string | null
        // Their latest requests, newest first (when asked, when reset).
        passwordResetRequests?: ResetRequest[]
    }
    onReset: () => void
}) {
    const [confirming, setConfirming] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [issued, setIssued] = useState<{ password: string; expiresAt: string } | null>(null)
    const history = customer.passwordResetRequests || []
    const requestedAt = customer.passwordResetRequestedAt
    const requestOpen = Boolean(requestedAt) && Date.now() - new Date(requestedAt!).getTime() < REQUEST_HOURS * 3600 * 1000

    async function reset() {
        setIsSaving(true)
        try {
            const res = await apiFetch(`/admin/customers/${customer._id}/reset-password`, { method: "POST" })
            const body = await res.json().catch(() => null)
            if (!res.ok || !body?.data) throw new Error(body?.message || "Could not reset the password")
            setIssued({ password: body.data.temporaryPassword, expiresAt: body.data.expiresAt })
            onReset()
            setConfirming(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not reset the password")
        } finally {
            setIsSaving(false)
        }
    }

    const message = issued
        ? `OXON: your one-time password is ${issued.password}. Sign in with it in the OXON app within 24 hours, then choose a new password.`
        : ""

    return (
        <section aria-labelledby="password-heading" className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 id="password-heading" className="flex items-center gap-2 font-medium">
                        <KeyRound className="h-4 w-4 text-amber-300" /> Password
                    </h3>
                    {issued ? (
                        <p className="mt-1 text-xs text-emerald-300">
                            Password reset. Share the one-time password below with them on {customer.phone || "their registered number"}.
                        </p>
                    ) : requestOpen ? (
                        <p className="mt-1 text-xs text-amber-200">
                            Asked to reset from the app on {formatDateTime(requestedAt!)}. Check the call or WhatsApp is from {customer.phone || "their registered number"}, then issue a one-time password.
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-gray-400">
                            No reset request from the app in the last 24 hours. Ask them to tap Forgot Password in the OXON app and send the reset request.
                        </p>
                    )}
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirming(true)}
                    disabled={!requestOpen}
                    title={requestOpen ? undefined : "Only after the customer asks from the app"}
                    className="border-amber-500/50 bg-transparent text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
                >
                    Reset password
                </Button>
            </div>

            {issued && (
                <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-200">One-time password (shown only now)</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <code className="select-all rounded bg-black/40 px-2 py-1 font-mono text-lg tracking-wider text-white">{issued.password}</code>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-[#444] text-white"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(issued.password)
                                    toast.success("Copied")
                                } catch {
                                    toast.error("Couldn't copy. Select the password and copy it.")
                                }
                            }}
                        >
                            <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                        </Button>
                        {customer.phone && (
                            <Button asChild size="sm" className="bg-[#25D366] text-black hover:bg-[#25D366]/90">
                                <a
                                    href={`https://wa.me/${whatsappNumber(customer.phone)}?text=${encodeURIComponent(message)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> Send on WhatsApp
                                </a>
                            </Button>
                        )}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                        Works until {formatDateTime(issued.expiresAt)}. They&apos;re signed out on every phone and must choose a new password when they sign in.
                    </p>
                </div>
            )}

            {history.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs font-medium text-gray-400">Reset requests</p>
                    <ul className="mt-1 space-y-1 text-xs text-gray-500">
                        {history.slice(0, 5).map((request) => (
                            <li key={request._id}>
                                Asked {formatDateTime(request.lastRequestedAt)} · {requestOutcome(request)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <AlertDialog open={confirming} onOpenChange={(next) => { if (!isSaving) setConfirming(next) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset {customer.name}&apos;s password?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-amber-700 dark:text-amber-300">
                                    Only if the request came from their registered number{customer.phone ? ` (${customer.phone})` : ""}.
                                </p>
                                <ul className="list-disc space-y-1 pl-5">
                                    <li>You get a one-time password to share with them. It works for 24 hours.</li>
                                    <li>Their current password stops working and they&apos;re signed out on every phone.</li>
                                    <li>When they sign in with it, the app asks them to choose a new password.</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 text-white hover:bg-amber-700"
                            disabled={isSaving}
                            onClick={(event) => { event.preventDefault(); void reset() }}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    )
}

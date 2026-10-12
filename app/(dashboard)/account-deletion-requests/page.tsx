"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

type DeletionStatus = "pending" | "in_review" | "completed" | "rejected" | "cancelled"

type DeletionRequest = {
  _id: string
  status: DeletionStatus
  source: "app" | "website"
  requestedAt: string
  dueAt: string
  completedAt?: string | null
  staffNote?: string | null
  openOrderCount?: number
  identityVerification?: { verifiedAt?: string | null; verifiedBy?: string | null; method?: string | null } | null
  userId?: { _id: string; name: string; email?: string | null; phone?: string | null; role?: string; isActive?: boolean } | null
}

type Summary = { open: number; overdue: number }

const statusLabel: Record<DeletionStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

const statusClass: Record<DeletionStatus, string> = {
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  in_review: "border-blue-400/40 bg-blue-400/10 text-blue-300",
  completed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  rejected: "border-red-400/40 bg-red-400/10 text-red-300",
  cancelled: "border-slate-400/40 bg-slate-400/10 text-slate-300",
}

const DAY_MS = 24 * 60 * 60 * 1000

function formatDate(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

async function fetchDeletionRequests(statusFilter: "all" | DeletionStatus) {
  const params = new URLSearchParams({ limit: "50" })
  if (statusFilter !== "all") params.set("status", statusFilter)
  const response = await apiFetch(`/admin/account-deletion-requests?${params.toString()}`)
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || "Unable to load deletion requests")
  return { requests: (body.data || []) as DeletionRequest[], summary: (body.summary || { open: 0, overdue: 0 }) as Summary }
}

export default function AccountDeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [summary, setSummary] = useState<Summary>({ open: 0, overdue: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | DeletionStatus>("all")
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null)
  const [staffNote, setStaffNote] = useState("")
  const [identityVerified, setIdentityVerified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Website requests need the admin to confirm they verified the account holder.
  const needsVerification = selectedRequest?.source === "website" && !selectedRequest.identityVerification?.verifiedAt
  const hasOpenOrders = (selectedRequest?.openOrderCount ?? 0) > 0

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchDeletionRequests(statusFilter)
      setRequests(result.requests)
      setSummary(result.summary)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load deletion requests")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { void load() }, [load])

  const overdueLabel = useMemo(() => (summary.overdue > 0 ? `${summary.overdue} overdue` : null), [summary.overdue])

  function openRequest(request: DeletionRequest) {
    setSelectedRequest(request)
    setStaffNote(request.staffNote || "")
    setIdentityVerified(Boolean(request.identityVerification?.verifiedAt))
  }

  async function updateStatus(status: "in_review" | "rejected" | "completed") {
    if (!selectedRequest) return
    if (status === "completed" && !window.confirm("Complete this deletion? This immediately closes the account and removes or anonymizes the customer's personal data. It cannot be undone.")) return

    setIsSubmitting(true)
    try {
      const endpoint = status === "completed"
        ? `/admin/account-deletion-requests/${selectedRequest._id}/complete`
        : `/admin/account-deletion-requests/${selectedRequest._id}`
      const response = await apiFetch(endpoint, {
        method: status === "completed" ? "POST" : "PUT",
        body: JSON.stringify(status === "completed" ? { staffNote, identityVerified } : { status, staffNote, identityVerified }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message || "Unable to update deletion request")
      toast.success(body.message || "Deletion request updated")
      setSelectedRequest(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update deletion request")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Deletion Requests</h1>
          <p className="mt-1 text-sm text-gray-400">
            Customers ask to delete their account in the app or on the website. Complete each verified request within 30 days. Orders and payments are kept without name, phone or street address.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-amber-200">{summary.open} awaiting action</Badge>
          {overdueLabel && <Badge className="border-red-400/30 bg-red-400/10 px-3 py-1.5 text-red-200">{overdueLabel}</Badge>}
          <select
            aria-label="Filter deletion requests by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | DeletionStatus)}
            className="h-10 rounded-md border border-[#333] bg-[#111] px-3 text-sm text-white outline-none focus:border-[#86efac]"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabel).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
          <Button onClick={() => void load()} variant="outline" className="border-[#333] bg-[#111] text-white hover:bg-[#222]">Refresh</Button>
        </div>
      </div>

      <Card className="border-[#333] bg-[#161616]">
        <CardHeader>
          <CardTitle className="text-white">Deletion queue</CardTitle>
          <CardDescription className="text-gray-400">Verify website requests with the account holder before marking them in review or completing them.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#86efac]" /></div>
          ) : requests.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No deletion requests match this filter.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const isOpen = request.status === "pending" || request.status === "in_review"
                const msLeft = new Date(request.dueAt).getTime() - Date.now()
                const isOverdue = isOpen && msLeft < 0
                const isDueSoon = isOpen && !isOverdue && msLeft <= 7 * DAY_MS
                return (
                  <button
                    type="button"
                    key={request._id}
                    onClick={() => openRequest(request)}
                    className="grid w-full gap-3 rounded-xl border border-[#333] bg-[#0D0D0D] p-4 text-left transition-colors hover:border-[#86efac]/50 hover:bg-[#151515] md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{request.userId?.name || "Account no longer available"}</p>
                      <p className="truncate text-sm text-gray-400">{request.userId?.phone || request.userId?.email || "—"}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Requested {formatDate(request.requestedAt)} via {request.source}
                        {isOpen && (request.openOrderCount ?? 0) > 0 ? ` · ${request.openOrderCount} order${request.openOrderCount === 1 ? "" : "s"} in progress` : ""}
                      </p>
                    </div>
                    <p className={`text-xs font-semibold md:text-right ${isOverdue ? "text-red-300" : isDueSoon ? "text-amber-300" : "text-gray-300"}`}>
                      {isOverdue ? "Overdue" : isDueSoon ? "Due soon" : "Due"}: {formatDate(request.dueAt)}
                    </p>
                    <Badge variant="outline" className={statusClass[request.status]}>{statusLabel[request.status]}</Badge>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedRequest !== null} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-xl border-[#333] bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>Process deletion request</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRequest?.userId?.name || "Unknown account"} · requested {formatDate(selectedRequest?.requestedAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4 text-sm text-gray-300">
                <p><span className="text-gray-500">Source:</span> {selectedRequest.source}</p>
                <p className="mt-2"><span className="text-gray-500">Due:</span> {formatDate(selectedRequest.dueAt)}</p>
                <p className="mt-2"><span className="text-gray-500">Status:</span> {statusLabel[selectedRequest.status]}</p>
                <p className="mt-3 text-xs leading-relaxed text-gray-500">
                  Completing closes the account and signs the customer out everywhere. It deletes their cart, notifications, push tokens, open negotiations, avatar, business documents and payment screenshots, anonymizes their profile, and removes name, phone and street address from past orders. Order and payment amounts stay.
                </p>
              </div>
              {selectedRequest.status === "pending" || selectedRequest.status === "in_review" ? (
                <>
                  {hasOpenOrders && (
                    <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                      This customer has {selectedRequest.openOrderCount} order{selectedRequest.openOrderCount === 1 ? "" : "s"} in progress. Completing is blocked until they are delivered or cancelled. You can reject the request with a note, or wait.
                    </p>
                  )}
                  {needsVerification ? (
                    <label className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                      <input type="checkbox" checked={identityVerified} onChange={(event) => setIdentityVerified(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-400" />
                      <span>I verified this request directly with the account holder. This confirmation is recorded against my account.</span>
                    </label>
                  ) : null}
                  <Textarea
                    value={staffNote}
                    onChange={(event) => setStaffNote(event.target.value)}
                    placeholder="Verification outcome or rejection reason"
                    className="min-h-28 border-[#333] bg-[#0D0D0D] text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-500">If you reject the request, this note is shown to the customer in the app.</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {selectedRequest.status === "pending" ? (
                      <Button disabled={isSubmitting || (needsVerification && !identityVerified)} onClick={() => void updateStatus("in_review")} variant="outline" className="border-blue-400/30 bg-blue-400/10 text-blue-200 hover:bg-blue-400/20">Mark in review</Button>
                    ) : null}
                    <Button disabled={isSubmitting} onClick={() => void updateStatus("rejected")} variant="outline" className="border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20">Reject request</Button>
                    <Button disabled={isSubmitting || hasOpenOrders || (needsVerification && !identityVerified)} onClick={() => void updateStatus("completed")} className="bg-[#86efac] text-black hover:bg-[#a7f3d0]">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete deletion"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="rounded-lg border border-[#333] bg-[#0D0D0D] p-3 text-sm text-gray-400">This request is no longer actionable. Note: {selectedRequest.staffNote || "—"}</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

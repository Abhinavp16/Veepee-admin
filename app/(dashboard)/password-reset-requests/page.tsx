"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CustomerPasswordReset, type ResetRequest } from "@/components/customer-password-reset"
import { apiFetch } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

type HistoryFilter = "history" | "completed" | "expired"

const historyFilterLabel: Record<HistoryFilter, string> = {
  history: "All",
  completed: "Reset done",
  expired: "Expired",
}

const statusLabel: Record<ResetRequest["status"], string> = {
  open: "Waiting",
  expired: "Expired",
  completed: "Reset done",
}

const statusClass: Record<ResetRequest["status"], string> = {
  open: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  expired: "border-slate-400/40 bg-slate-400/10 text-slate-300",
  completed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
}

async function fetchRequests(status: "open" | HistoryFilter) {
  const response = await apiFetch(`/admin/password-reset-requests?status=${status}&limit=100`)
  const body = await response.json().catch(() => null)
  if (!response.ok || !body) throw new Error(body?.message || "Unable to load password reset requests")
  return body.data as ResetRequest[]
}

function Customer({ request }: { request: ResetRequest }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-white">
        {request.name || "Customer"}
        {request.role === "wholesaler" && <span className="ml-2 text-xs font-normal text-gray-400">Wholesaler</span>}
      </p>
      <p className="truncate text-sm text-gray-300">{request.phone || "—"}</p>
    </div>
  )
}

/**
 * Customers who tapped Forgot Password in the app and sent a reset request.
 * Waiting ones (open for 24 hours, one reset each) on top; below, the
 * history: when each customer asked and when the password was reset.
 */
export default function PasswordResetRequestsPage() {
  const [waiting, setWaiting] = useState<ResetRequest[]>([])
  const [history, setHistory] = useState<ResetRequest[]>([])
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("history")
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<ResetRequest | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [open, past] = await Promise.all([fetchRequests("open"), fetchRequests(historyFilter)])
      setWaiting(open)
      setHistory(past)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load password reset requests")
    } finally {
      setIsLoading(false)
    }
  }, [historyFilter])

  useEffect(() => { void load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Password Reset Requests</h1>
          <p className="mt-1 text-sm text-gray-400">
            Customers who tapped Forgot Password in the app. When they call or WhatsApp from the same number, issue a one-time password. Each request works once, for 24 hours.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-amber-200">{waiting.length} waiting</Badge>
          <Button onClick={() => void load()} variant="outline" className="border-[#333] bg-[#111] text-white hover:bg-[#222]">Refresh</Button>
        </div>
      </div>

      <Card className="border-[#333] bg-[#161616]">
        <CardHeader>
          <CardTitle className="text-white">Waiting</CardTitle>
          <CardDescription className="text-gray-400">
            Only reset after checking the call or WhatsApp comes from the number shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#86efac]" /></div>
          ) : waiting.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No one is waiting for a password reset.</p>
          ) : (
            <div className="space-y-3">
              {waiting.map((request) => (
                <div
                  key={request._id}
                  className="grid w-full gap-3 rounded-xl border border-[#333] bg-[#0D0D0D] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <Customer request={request} />
                    <p className="mt-1 text-xs text-gray-500">
                      Asked {formatDateTime(request.lastRequestedAt)} · open until {formatDateTime(request.expiresAt)}
                    </p>
                  </div>
                  {request.customerId ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelected(request)}
                      className="bg-amber-500 text-black hover:bg-amber-400"
                    >
                      Reset password
                    </Button>
                  ) : <span className="text-xs text-gray-500">Account no longer available</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#333] bg-[#161616]">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-white">History</CardTitle>
            <CardDescription className="text-gray-400">When each customer asked, and when the password was reset.</CardDescription>
          </div>
          <select
            aria-label="Filter password reset history"
            value={historyFilter}
            onChange={(event) => setHistoryFilter(event.target.value as HistoryFilter)}
            className="h-9 rounded-md border border-[#333] bg-[#111] px-3 text-sm text-white outline-none focus:border-[#86efac]"
          >
            {Object.entries(historyFilterLabel).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#86efac]" /></div>
          ) : history.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No past requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr className="border-b border-[#333]">
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 pr-4 font-medium">Asked</th>
                    <th className="py-2 pr-4 font-medium">Reset</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((request) => (
                    <tr key={request._id} className="border-b border-[#222] align-top last:border-0">
                      <td className="py-3 pr-4"><Customer request={request} /></td>
                      <td className="py-3 pr-4 text-gray-300">{formatDateTime(request.lastRequestedAt)}</td>
                      <td className="py-3 pr-4 text-gray-300">
                        {request.status === "completed" ? (
                          <>
                            {formatDateTime(request.completedAt)}
                            {request.completedByName && <span className="block text-xs text-gray-500">by {request.completedByName}</span>}
                          </>
                        ) : <span className="text-gray-500">Not reset</span>}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={statusClass[request.status]}>{statusLabel[request.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(next) => { if (!next) { setSelected(null); void load() } }}>
        <DialogContent className="max-w-xl border-[#333] bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>{selected?.name || "Customer"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selected?.phone} · asked {formatDateTime(selected?.lastRequestedAt)}
            </DialogDescription>
          </DialogHeader>
          {selected?.customerId ? (
            <CustomerPasswordReset
              key={selected._id}
              customer={{
                _id: selected.customerId,
                name: selected.name,
                phone: selected.phone,
                passwordResetRequestedAt: selected.status === "open" ? selected.lastRequestedAt : null,
              }}
              onReset={() => setSelected((current) => current ? { ...current, status: "completed" } : current)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

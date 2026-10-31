"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Edit2, Trash2, Power, User, History, Download, CheckCircle2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { AffiliateModal } from "@/components/offers/affiliate-modal"
import { apiFetch } from "@/lib/api"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDate, labelFor } from "@/lib/format"

interface AffiliateCode {
  _id: string
  code: string
  personName: string
  discountType: "percentage" | "fixed"
  discountValue: number
  usageLimit: number
  usageCount: number
  isActive: boolean
  startDate: string
  endDate?: string
  totalDiscountGenerated?: number
  totalCommissionAccrued?: number
  perCustomerLimit?: number
}

type CommissionStatus = "unpaid" | "paid" | "reversed"

interface AffiliateSummary {
  codes: number
  activeCodes: number
  uses: number
  discountGiven: number
  pending: { count: number; amount: number }
  paid: { count: number; amount: number }
  reversed: { count: number; amount: number }
  toRecover: { count: number; amount: number }
}

interface UsageItem {
  _id: string
  orderNumber: string
  total: number
  status: string
  createdAt: string
  discount?: number
  commissionAmount?: number
  commissionStatus?: string | null
  customerSnapshot?: { name?: string }
}

interface CommissionItem {
  _id: string
  orderNumber: string
  affiliateCode: string
  personNameSnapshot: string
  discountAmount: number
  commissionAmount: number
  status: CommissionStatus
  triggerEvent: "payment_verified"
  createdAt: string
  paidAt?: string | null
  payoutReference?: string
  reversedAt?: string | null
  reversalReason?: string
  wasPaidBeforeReversal?: boolean
}

const STATUS_FILTERS: { value: "" | CommissionStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "unpaid", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "reversed", label: "Reversed" },
]

function CommissionBadge({ row }: { row: Pick<CommissionItem, "status" | "wasPaidBeforeReversal" | "reversalReason"> }) {
  if (row.status === "paid") return <Badge variant="outline" className="text-green-400 border-green-400">Paid</Badge>
  if (row.status === "reversed") {
    return (
      <Badge variant="outline" className="text-red-300 border-red-300" title={row.reversalReason || undefined}>
        {row.wasPaidBeforeReversal ? "Reversed · recover" : "Reversed"}
      </Badge>
    )
  }
  return <Badge variant="outline" className="text-yellow-300 border-yellow-300">Pending</Badge>
}

const formatInr = (v: number) => `₹${Number(v || 0).toFixed(2)}`

export default function AffiliateCodesPage() {
  const [codes, setCodes] = useState<AffiliateCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<AffiliateCode | null>(null)
  const [isUsageOpen, setIsUsageOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<AffiliateCode | null>(null)
  const [usageData, setUsageData] = useState<UsageItem[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [commissions, setCommissions] = useState<CommissionItem[]>([])
  const [commissionsLoading, setCommissionsLoading] = useState(true)
  const [commissionPage, setCommissionPage] = useState(1)
  const [commissionsHasMore, setCommissionsHasMore] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"" | CommissionStatus>("unpaid")
  const [summary, setSummary] = useState<AffiliateSummary | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [payOpen, setPayOpen] = useState(false)
  const [payReference, setPayReference] = useState("")
  const [payNote, setPayNote] = useState("")
  const [paying, setPaying] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchCodes()
    fetchSummary()
  }, [])

  useEffect(() => {
    setSelected([])
    fetchCommissions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // Every code, page by page (the list used to stop at the first 20).
  async function fetchCodes() {
    try {
      const all: AffiliateCode[] = []
      for (let page = 1; page <= 20; page++) {
        const res = await apiFetch(`/admin/affiliate-codes?limit=50&page=${page}`)
        const data = await res.json()
        if (!res.ok) {
          toast.error("Failed to fetch affiliate codes")
          break
        }
        all.push(...(data.data || []))
        if (!data.pagination?.hasNext) break
      }
      setCodes(all)
    } catch (error) {
      console.error(error)
      toast.error("Error connecting to server")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchSummary() {
    try {
      const res = await apiFetch("/admin/affiliate-summary")
      const data = await res.json()
      if (res.ok) setSummary(data.data)
    } catch (error) {
      console.error(error)
    }
  }

  async function fetchCommissions(page = 1) {
    setCommissionsLoading(page === 1)
    try {
      const params = new URLSearchParams({ limit: "50", page: String(page) })
      if (statusFilter) params.set("status", statusFilter)
      const res = await apiFetch(`/admin/affiliate-commissions?${params}`)
      const data = await res.json()
      if (res.ok) {
        setCommissions((prev) => (page === 1 ? data.data || [] : [...prev, ...(data.data || [])]))
        setCommissionPage(page)
        setCommissionsHasMore(Boolean(data.pagination?.hasNext))
      } else {
        toast.error("Failed to fetch commission history")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch commission history")
    } finally {
      setCommissionsLoading(false)
    }
  }

  const selectable = commissions.filter((row) => row.status === "unpaid")
  const selectedTotal = commissions
    .filter((row) => selected.includes(row._id))
    .reduce((sum, row) => sum + (row.commissionAmount || 0), 0)

  async function markPaid() {
    setPaying(true)
    try {
      const res = await apiFetch("/admin/affiliate-commissions/pay", {
        method: "POST",
        body: JSON.stringify({ ids: selected, reference: payReference.trim(), note: payNote.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Could not mark as paid")
      toast.success(data.message || "Marked paid")
      setPayOpen(false)
      setSelected([])
      setPayReference("")
      setPayNote("")
      fetchCommissions(1)
      fetchSummary()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark as paid")
    } finally {
      setPaying(false)
    }
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await apiFetch(`/admin/affiliate-commissions/export?${params}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `affiliate-commissions-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  async function fetchUsage(code: AffiliateCode) {
    setSelectedCode(code)
    setIsUsageOpen(true)
    setUsageLoading(true)
    try {
      const res = await apiFetch(`/admin/affiliate-codes/${code._id}/usage`)
      const data = await res.json()
      if (res.ok) {
        setUsageData(data.data || [])
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch usage history")
    } finally {
      setUsageLoading(false)
    }
  }

  async function toggleStatus(id: string) {
    try {
      const res = await apiFetch(`/admin/affiliate-codes/${id}/toggle`, { method: "PATCH" })
      if (res.ok) {
        setCodes((prev) => prev.map((c) => (c._id === id ? { ...c, isActive: !c.isActive } : c)))
        toast.success("Status updated")
      }
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  async function deleteCode(id: string) {
    if (!confirm("Are you sure you want to delete this affiliate code?")) return
    try {
      const res = await apiFetch(`/admin/affiliate-codes/${id}`, { method: "DELETE" })
      if (res.ok) {
        setCodes((prev) => prev.filter((c) => c._id !== id))
        toast.success("Code deleted")
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || "Failed to delete code")
      }
    } catch (error) {
      toast.error("Failed to delete code")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Affiliate Codes</h1>
        <Button
          onClick={() => {
            setEditingCode(null)
            setIsModalOpen(true)
          }}
          className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Code
        </Button>
      </div>

      {/* Totals over every code; commission is 30% of the discount given. */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Pending payout", value: summary?.pending.amount, sub: `${summary?.pending.count ?? 0} orders`, tone: "text-yellow-300" },
          { label: "Paid", value: summary?.paid.amount, sub: `${summary?.paid.count ?? 0} orders`, tone: "text-[#86efac]" },
          { label: "To recover", value: summary?.toRecover.amount, sub: "Paid, then the order was cancelled", tone: "text-red-300" },
          { label: "Discount given", value: summary?.discountGiven, sub: `${summary?.uses ?? 0} uses · ${summary?.activeCodes ?? 0} active codes`, tone: "text-white" },
        ].map((card) => (
          <Card key={card.label} className="bg-[#161616] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.tone}`}>{summary ? formatInr(card.value || 0) : "—"}</div>
              <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="-mt-3 text-xs text-gray-500">Commission is 30% of the discount the affiliate&apos;s code gave, recorded when the payment is verified.</p>

      <Card className="bg-[#161616] border-[#333]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Affiliate codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No affiliate codes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400">Affiliate / Person</TableHead>
                  <TableHead className="text-gray-400">Code</TableHead>
                  <TableHead className="text-gray-400">Discount</TableHead>
                  <TableHead className="text-gray-400">Usage</TableHead>
                  <TableHead className="text-gray-400 max-xl:hidden">Total Discount</TableHead>
                  <TableHead className="text-gray-400">Total Commission</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code._id} className="border-[#333] hover:bg-[#1A1A1A]">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="font-medium">{code.personName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-[#0D0D0D] px-2 py-1 rounded text-[#86efac] text-xs font-mono">
                        {code.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-white">
                      {code.discountType === "percentage" ? `${code.discountValue}%` : formatInr(code.discountValue)}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs text-center">
                      <div className="font-bold text-white">{code.usageCount}</div>
                      <div>limit: {code.usageLimit || "∞"}</div>
                    </TableCell>
                    <TableCell className="text-white max-xl:hidden">{formatInr(code.totalDiscountGenerated || 0)}</TableCell>
                    <TableCell className="text-[#86efac]">{formatInr(code.totalCommissionAccrued || 0)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={code.isActive ? "text-green-400 border-green-400" : "text-gray-500 border-gray-500"}
                      >
                        {code.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-[#86efac] hover:bg-[#86efac]/10 flex items-center gap-2 border border-[#86efac]/20"
                          onClick={() => fetchUsage(code)}
                        >
                          <History className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">History</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white hover:bg-[#333]"
                          onClick={() => toggleStatus(code._id)}
                          title={code.isActive ? "Deactivate" : "Activate"}
                        >
                          <Power className={`h-4 w-4 ${code.isActive ? "text-green-400" : "text-gray-400"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white hover:bg-[#333]"
                          onClick={() => {
                            setEditingCode(code)
                            setIsModalOpen(true)
                          }}
                         aria-label="Edit" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                          onClick={() => deleteCode(code._id)}
                         aria-label="Delete" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#161616] border-[#333]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-white text-lg">Commission History</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-[#333] p-0.5">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1 text-xs rounded ${statusFilter === filter.value ? "bg-[#86efac] text-black font-semibold" : "text-gray-300 hover:bg-[#222]"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="border-[#333] text-white" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />} Export CSV
            </Button>
            <Button
              size="sm"
              className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
              disabled={selected.length === 0}
              onClick={() => setPayOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark paid{selected.length > 0 ? ` (${selected.length} · ${formatInr(selectedTotal)})` : ""}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No commission records found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#333] hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all pending"
                      checked={selectable.length > 0 && selectable.every((row) => selected.includes(row._id))}
                      disabled={selectable.length === 0}
                      onCheckedChange={(checked) => setSelected(checked === true ? selectable.map((row) => row._id) : [])}
                    />
                  </TableHead>
                  <TableHead className="text-gray-400">Order</TableHead>
                  <TableHead className="text-gray-400">Affiliate</TableHead>
                  <TableHead className="text-gray-400">Discount</TableHead>
                  <TableHead className="text-gray-400">Commission</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((row) => (
                  <TableRow key={row._id} className="border-[#333] hover:bg-[#1A1A1A]">
                    <TableCell>
                      {row.status === "unpaid" && (
                        <Checkbox
                          aria-label={`Select ${row.orderNumber}`}
                          checked={selected.includes(row._id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) => (checked === true ? [...prev, row._id] : prev.filter((id) => id !== row._id)))
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-gray-300">{row.orderNumber}</TableCell>
                    <TableCell>
                      <div className="text-white">{row.personNameSnapshot}</div>
                      <div className="text-xs text-[#86efac] font-mono">{row.affiliateCode}</div>
                    </TableCell>
                    <TableCell className="text-white">{formatInr(row.discountAmount)}</TableCell>
                    <TableCell className="text-[#86efac]">{formatInr(row.commissionAmount)}</TableCell>
                    <TableCell>
                      <CommissionBadge row={row} />
                      {row.status === "paid" && (
                        <div className="text-[11px] text-gray-500 mt-1">
                          {formatDate(row.paidAt || "")}{row.payoutReference ? ` · ${row.payoutReference}` : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {formatDate(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {commissionsHasMore && !commissionsLoading && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" className="border-[#333] text-white" onClick={() => fetchCommissions(commissionPage + 1)}>
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={(open) => { if (!paying) setPayOpen(open) }}>
        <DialogContent className="bg-[#161616] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Mark {selected.length} commission{selected.length === 1 ? "" : "s"} paid</DialogTitle>
            <DialogDescription className="text-gray-400">
              Total {formatInr(selectedTotal)}. Pay the affiliate by UPI or bank transfer first, then record it here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="payout-reference" className="text-sm text-gray-300">UPI / bank reference</label>
              <Input
                id="payout-reference"
                value={payReference}
                maxLength={120}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UPI ref 4123 5678 9012"
                className="mt-1 bg-[#0D0D0D] border-[#333] text-white"
              />
            </div>
            <div>
              <label htmlFor="payout-note" className="text-sm text-gray-300">Note (optional)</label>
              <Input
                id="payout-note"
                value={payNote}
                maxLength={300}
                onChange={(e) => setPayNote(e.target.value)}
                className="mt-1 bg-[#0D0D0D] border-[#333] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-[#333] text-white" onClick={() => setPayOpen(false)} disabled={paying}>Cancel</Button>
            <Button className="bg-[#86efac] text-black hover:bg-[#86efac]/90" onClick={markPaid} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AffiliateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchCodes()
          fetchSummary()
          fetchCommissions(1)
        }}
        code={editingCode}
      />

      <Sheet open={isUsageOpen} onOpenChange={setIsUsageOpen}>
        <SheetContent side="right" className="bg-[#161616] border-l-[#333] text-white sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-[#333]">
            <SheetTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5 text-[#86efac]" />
              Usage History
            </SheetTitle>
            <SheetDescription className="text-gray-400">
              Orders that used code <span className="text-[#86efac] font-mono">{selectedCode?.code}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {usageLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-[#86efac]" />
                <p>Checking usage data...</p>
              </div>
            ) : usageData.length > 0 ? (
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  {usageData.map((usage) => (
                    <div
                      key={usage._id}
                      className="bg-[#0D0D0D] border border-[#333] p-4 rounded-xl flex items-center justify-between group hover:border-[#86efac]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-[#161616] flex items-center justify-center border border-[#333] group-hover:border-[#86efac]/30">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{usage.customerSnapshot?.name || "Anonymous"}</p>
                          <p className="text-xs text-gray-500 font-mono">Order #{usage.orderNumber}</p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            Discount: {formatInr(usage.discount || 0)} | Commission: {formatInr(usage.commissionAmount || 0)}
                          </p>
                          {usage.commissionStatus && (
                            <div className="mt-1">
                              <CommissionBadge row={{ status: usage.commissionStatus as CommissionStatus }} />
                            </div>
                          )}
                          <p className="text-[11px] text-gray-600 mt-1">
                            {formatDate(usage.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#86efac] text-lg">{formatInr(usage.total || 0)}</p>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full inline-block border ${
                            usage.status === "delivered"
                              ? "bg-green-500/5 text-green-500 border-green-500/20"
                              : usage.status === "cancelled"
                              ? "bg-red-500/5 text-red-500 border-red-500/20"
                              : "bg-blue-500/5 text-blue-500 border-blue-500/20"
                          }`}
                        >
                          {labelFor(usage.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                <div className="h-20 w-20 rounded-full bg-[#333]/20 flex items-center justify-center mb-4">
                  <User className="h-10 w-10 text-gray-600 opacity-20" />
                </div>
                <h3 className="text-gray-300 font-medium mb-1">No usage recorded</h3>
                <p className="text-sm text-gray-500">This affiliate code hasn&apos;t been used by any customers yet.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

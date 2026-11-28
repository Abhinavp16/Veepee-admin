"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Eye, Loader2, Search, X, XCircle } from "lucide-react"
import { toast } from "sonner"
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
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { BusinessDetails } from "@/components/business-details"
import { TableSkeleton } from "@/components/table-skeleton"
import { NewFeatureHint, NewPill, useNewOnPage } from "@/components/whats-new"
import { apiFetch } from "@/lib/api"
import { formatDate, labelFor } from "@/lib/format"
import {
    APPLICATION_STATUSES,
    APPLICATION_STATUS_LABELS,
    EMPTY_COUNTS,
    announcePendingUpgradesChanged,
    applicationDate,
    applicationStatusOf,
    isApplicationStatus,
    type ApplicationCounts,
    type ApplicationStatus,
    type WholesalerApplication,
} from "@/lib/wholesaler-applications"

const PAGE_SIZE = 20

const dateHeadings: Record<ApplicationStatus, string> = {
    pending: "Applied",
    accepted: "Accepted",
    rejected: "Rejected",
    removed: "Removed",
}

const emptyMessages: Record<ApplicationStatus, string> = {
    pending: "No applications waiting.",
    accepted: "No accepted applications yet.",
    rejected: "No rejected applications.",
    removed: "No wholesalers have been switched back to customers.",
}

const statusBadge: Record<ApplicationStatus, string> = {
    pending: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    accepted: "text-green-400 border-green-500/30 bg-green-500/5",
    rejected: "text-red-400 border-red-500/30 bg-red-500/5",
    removed: "text-gray-400 border-[#333] bg-[#1A1A1A]",
}

export default function AccountUpgradesPage() {
    // What's new: tabs, search, Load more, proof photos and who decided.
    const feature = useNewOnPage("wholesaler-applications")
    const [status, setStatus] = useState<ApplicationStatus>("pending")
    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const [items, setItems] = useState<WholesalerApplication[]>([])
    const [counts, setCounts] = useState<ApplicationCounts>(EMPTY_COUNTS)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)
    const [ready, setReady] = useState(false)

    const [selected, setSelected] = useState<WholesalerApplication | null>(null)
    const [isReloading, setIsReloading] = useState(false)
    const [processing, setProcessing] = useState<"accept" | "reject" | null>(null)

    // Only the latest request may fill the list (fast typing, tab switches).
    const requestId = useRef(0)

    // A link such as /account-upgrades?status=accepted&search=98… opens filtered.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const initialStatus = params.get("status")
        const initialSearch = params.get("search") || ""
        if (isApplicationStatus(initialStatus)) setStatus(initialStatus)
        setSearchInput(initialSearch)
        setSearch(initialSearch.trim())
        setReady(true)
    }, [])

    // Search as they type, once they pause.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const load = useCallback(async (pageNum: number, append: boolean) => {
        const id = ++requestId.current
        if (append) setIsLoadingMore(true)
        else setIsLoading(true)
        try {
            const params = new URLSearchParams({ status, page: String(pageNum), limit: String(PAGE_SIZE) })
            if (search) params.set("search", search)
            const res = await apiFetch(`/admin/wholesaler-applications?${params.toString()}`)
            const body = await res.json().catch(() => null)
            if (id !== requestId.current) return
            if (!res.ok) {
                setLoadFailed(true)
                toast.error(body?.message || "Could not load applications")
                return
            }
            const rows: WholesalerApplication[] = body?.data || []
            // Appending: rows that moved up since the last page aren't shown twice.
            setItems((current) => {
                if (!append) return rows
                const seen = new Set(current.map((row) => row._id))
                return [...current, ...rows.filter((row) => !seen.has(row._id))]
            })
            setCounts({ ...EMPTY_COUNTS, ...(body?.counts || {}) })
            setTotal(body?.pagination?.total ?? rows.length)
            setPage(pageNum)
            setHasMore(Boolean(body?.pagination?.hasNext))
            setLoadFailed(false)
        } catch {
            if (id === requestId.current) {
                setLoadFailed(true)
                toast.error("Error connecting to server")
            }
        } finally {
            if (id === requestId.current) {
                setIsLoading(false)
                setIsLoadingMore(false)
            }
        }
    }, [status, search])

    useEffect(() => {
        if (ready) void load(1, false)
    }, [ready, load])

    // Fresh photo links (they work for 15 minutes) and the latest details,
    // including the status (Accept/Reject go when someone else decided).
    async function reloadSelected(id = selected?._id) {
        if (!id) return
        setIsReloading(true)
        try {
            const res = await apiFetch(`/admin/customers/${id}`)
            const body = await res.json().catch(() => null)
            if (!res.ok || !body?.data) throw new Error(body?.message || "Could not reload the photos")
            setSelected((current) => current && current._id === id
                ? {
                    ...current,
                    name: body.data.name,
                    phone: body.data.phone,
                    email: body.data.email,
                    role: body.data.role,
                    businessInfo: body.data.businessInfo,
                    applicationStatus: applicationStatusOf(body.data.role, body.data.businessInfo) ?? current.applicationStatus,
                }
                : current)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not reload the photos")
        } finally {
            setIsReloading(false)
        }
    }

    async function decide(action: "accept" | "reject") {
        if (!selected) return
        setProcessing(action)
        try {
            const res = await apiFetch(`/admin/customers/${selected._id}/upgrade`, {
                method: "PUT",
                body: JSON.stringify({ action }),
            })
            const body = await res.json().catch(() => null)
            if (res.status === 409 && body?.error?.code === "APPLICATION_NOT_PENDING") {
                // Someone else decided first: show who, and the current state.
                toast.error(body.message || "This application was already handled.")
                announcePendingUpgradesChanged()
                await Promise.all([reloadSelected(selected._id), load(1, false)])
                return
            }
            if (!res.ok) throw new Error(body?.message || `Could not ${action} the application`)
            toast.success(action === "accept" ? `${selected.name} is now a wholesaler` : "Application rejected")
            setSelected(null)
            announcePendingUpgradesChanged()
            await load(1, false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Could not ${action} the application`)
        } finally {
            setProcessing(null)
        }
    }

    const selectedStatus = selected?.applicationStatus

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-white sm:text-3xl">Account Upgrades {feature.isNew && <NewPill />}</h1>
                <p className="text-sm text-gray-400">Review applications for wholesaler accounts</p>
            </div>

            <NewFeatureHint feature={feature} className="-mt-3" />

            <Tabs value={status} onValueChange={(value) => { if (isApplicationStatus(value)) setStatus(value) }} className="gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <TabsList aria-label="Application status" className="h-auto w-full flex-wrap justify-start gap-1 border border-[#333] bg-[#161616] p-1 md:w-fit">
                        {APPLICATION_STATUSES.map((key) => (
                            <TabsTrigger
                                key={key}
                                value={key}
                                className="h-8 flex-none px-3 text-gray-400 data-[state=active]:bg-[#86efac] data-[state=active]:text-black dark:data-[state=active]:bg-[#86efac] dark:data-[state=active]:text-black"
                            >
                                {APPLICATION_STATUS_LABELS[key]}
                                <span className="tabular-nums opacity-80">({counts[key]})</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="relative w-full md:max-w-sm">
                        <label htmlFor="upgrade-search" className="sr-only">Search applications</label>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <Input
                            id="upgrade-search"
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Name, phone, business or GST"
                            className="border-[#333] bg-[#161616] pl-10 pr-9 text-white placeholder:text-gray-500 focus-visible:ring-[#86efac]"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => setSearchInput("")}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {APPLICATION_STATUSES.map((key) => (
                    <TabsContent key={key} value={key}>
                        <Card className={`border-[#333] bg-[#161616] ${feature.isNew ? "whats-new-glow" : ""}`}>
                            <CardContent className="p-3 sm:p-6">
                                <p className="sr-only" role="status">
                                    {isLoading ? "Loading applications" : `${total} ${APPLICATION_STATUS_LABELS[key].toLowerCase()} ${total === 1 ? "application" : "applications"}${search ? ` matching ${search}` : ""}`}
                                </p>
                                {isLoading ? (
                                    <TableSkeleton columns={4} />
                                ) : items.length === 0 ? (
                                    <div className="py-10 text-center text-sm text-gray-500">
                                        {loadFailed ? (
                                            <Button type="button" variant="outline" onClick={() => void load(1, false)} className="border-[#333] bg-transparent text-white hover:bg-[#1A1A1A]">Try again</Button>
                                        ) : search ? `Nothing matches “${search}”.` : emptyMessages[key]}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-[#333] hover:bg-transparent">
                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Applicant</TableHead>
                                                <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">Business</TableHead>
                                                <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-gray-400 md:table-cell">{dateHeadings[key]}</TableHead>
                                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-gray-400"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((application) => (
                                                <TableRow key={application._id} className="border-[#333] hover:bg-[#1A1A1A]">
                                                    <TableCell className="max-w-[12rem] whitespace-normal py-3">
                                                        <div className="text-sm font-medium text-white">{application.name}</div>
                                                        <div className="text-xs text-gray-500">{application.phone || application.email || "—"}</div>
                                                        {/* On phones the business shows here. */}
                                                        <div className="mt-0.5 text-xs text-gray-400 sm:hidden">{application.businessInfo?.businessName}</div>
                                                    </TableCell>
                                                    <TableCell className="hidden max-w-[16rem] whitespace-normal py-3 sm:table-cell">
                                                        <div className="text-sm text-white">{application.businessInfo?.businessName || "—"}</div>
                                                        {application.businessInfo?.gstNumber && <div className="font-mono text-xs text-gray-500">{application.businessInfo.gstNumber}</div>}
                                                    </TableCell>
                                                    <TableCell className="hidden py-3 text-xs text-gray-400 md:table-cell">
                                                        {formatDate(applicationDate(application))}
                                                        {(key === "accepted" || key === "rejected") && application.businessInfo?.reviewedBy?.name && (
                                                            <div className="text-gray-500">by {application.businessInfo.reviewedBy.name}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelected(application)}
                                                            aria-label={`${key === "pending" ? "Review" : "View"} ${application.name}'s application`}
                                                            className="h-8 border border-transparent px-3 text-[#86efac] hover:border-[#86efac]/20 hover:bg-[#86efac]/10"
                                                        >
                                                            <Eye className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                                                            <span className="hidden text-xs font-medium sm:inline">{key === "pending" ? "Review" : "View"}</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}

                                {!isLoading && hasMore && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => void load(page + 1, true)}
                                            disabled={isLoadingMore}
                                            className="min-w-[12rem] border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                                        >
                                            {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Loading…</> : `Load more (${items.length} of ${total})`}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>

            <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !processing) setSelected(null) }}>
                <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto border-[#333] bg-[#161616] text-white sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Application details</DialogTitle>
                        <DialogDescription>
                            {selected ? `${selected.name} · ${labelFor(selected.role)} account` : ""}
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-5">
                            <section aria-labelledby="applicant-heading" className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4">
                                <h3 id="applicant-heading" className="mb-3 text-sm font-semibold text-white">Account</h3>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                                    <div><dt className="mb-0.5 text-xs text-gray-500">Name</dt><dd className="break-words">{selected.name}</dd></div>
                                    <div><dt className="mb-0.5 text-xs text-gray-500">Sign-in phone</dt><dd>{selected.phone || "—"}</dd></div>
                                    {selected.email && <div className="sm:col-span-2"><dt className="mb-0.5 text-xs text-gray-500">Email</dt><dd className="break-words">{selected.email}</dd></div>}
                                    <div>
                                        <dt className="mb-0.5 text-xs text-gray-500">Account type</dt>
                                        <dd>{labelFor(selected.role)}</dd>
                                    </div>
                                    <div>
                                        <dt className="mb-0.5 text-xs text-gray-500">Application</dt>
                                        <dd>
                                            {selectedStatus && (
                                                <Badge variant="outline" className={`text-[11px] font-bold uppercase ${statusBadge[selectedStatus]}`}>
                                                    {APPLICATION_STATUS_LABELS[selectedStatus]}
                                                </Badge>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            <section aria-labelledby="business-heading" className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4">
                                <h3 id="business-heading" className="mb-3 text-sm font-semibold text-white">Business</h3>
                                <BusinessDetails
                                    info={selected.businessInfo || {}}
                                    onReload={() => void reloadSelected()}
                                    reloading={isReloading}
                                    customerId={selected._id}
                                />
                            </section>

                            <div className="flex flex-col-reverse gap-2 border-t border-[#333] pt-4 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-[#333] bg-transparent text-white hover:bg-[#333]"
                                    disabled={processing !== null}
                                    onClick={() => setSelected(null)}
                                >
                                    Close
                                </Button>
                                {selectedStatus === "pending" && (
                                    <>
                                        <Button
                                            type="button"
                                            className="border border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                            disabled={processing !== null}
                                            onClick={() => void decide("reject")}
                                        >
                                            {processing === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
                                            Reject
                                        </Button>
                                        <Button
                                            type="button"
                                            className="border border-green-500/50 bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                            disabled={processing !== null}
                                            onClick={() => void decide("accept")}
                                        >
                                            {processing === "accept" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                                            Accept application
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

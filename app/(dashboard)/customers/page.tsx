"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, User, ShoppingBag, TrendingUp, Search, Bell, Send, CheckSquare, Square, X } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

interface Customer {
    _id: string
    name: string
    email: string
    phone: string
    role: string
    businessInfo?: {
        businessName: string
        gstIn: string
    }
    createdAt: string
}

interface CustomerDetails extends Customer {
    stats: {
        orders: { totalOrders: number; totalSpent: number }
        negotiations: Record<string, number>
    }
    recentOrders: {
        _id: string
        orderNumber: string
        total: number
        status: string
        createdAt: string
    }[]
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    // Selection & Notification state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [notificationData, setNotificationData] = useState({ title: "", body: "" })

    // Search & Pagination state
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCustomers, setTotalCustomers] = useState(0)
    const [hasMore, setHasMore] = useState(false)

    useEffect(() => {
        fetchCustomers(1, true)
    }, [])

    async function fetchCustomers(pageNum: number = 1, reset: boolean = false) {
        if (reset) {
            setIsLoading(true)
            setPage(1)
        } else {
            setIsLoadingMore(true)
        }

        try {
            const params = new URLSearchParams()
            params.append('page', pageNum.toString())
            params.append('limit', '20')
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim())
            }

            const res = await apiFetch(`/admin/customers?${params.toString()}`)
            const data = await res.json()
            if (res.ok) {
                const items = data.data || []
                const pagination = data.pagination || {}

                if (reset || pageNum === 1) {
                    setCustomers(items)
                } else {
                    setCustomers(prev => [...prev, ...items])
                }

                setTotalPages(pagination.totalPages || 1)
                setTotalCustomers(pagination.total || items.length)
                setHasMore((pagination.page || 1) < (pagination.totalPages || 1))
            } else {
                toast.error("Failed to fetch customers")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        fetchCustomers(1, true)
    }, [searchQuery])

    const loadMore = useCallback(() => {
        if (hasMore && !isLoadingMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchCustomers(nextPage, false)
        }
    }, [hasMore, isLoadingMore, page])

    async function fetchCustomerDetails(id: string) {
        try {
            const res = await apiFetch(`/admin/customers/${id}`)
            const data = await res.json()
            if (res.ok) {
                setSelectedCustomer(data.data)
                setIsDetailsOpen(true)
            }
        } catch (error) {
            toast.error("Failed to load details")
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === customers.length && customers.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(customers.map(c => c._id))
        }
    }

    const toggleDraftingHeader = () => {
        setIsNotifyModalOpen(prev => !prev)
    }

    async function handleSendNotification() {
        if (!notificationData.title || !notificationData.body) {
            toast.error("Please fill in both title and message")
            return
        }

        setIsSending(true)
        try {
            const res = await apiFetch("/admin/customers/notifications", {
                method: "POST",
                body: JSON.stringify({
                    userIds: selectedIds,
                    title: notificationData.title,
                    body: notificationData.body
                })
            })

            const data = await res.json()
            if (res.ok) {
                toast.success(data.message || "Notification sent successfully")
                setIsNotifyModalOpen(false)
                setNotificationData({ title: "", body: "" })
                setSelectedIds([])
            } else {
                toast.error(data.message || "Failed to send notification")
            }
        } catch (error) {
            toast.error("Error connecting to server")
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Customers</h1>
                    <p className="text-gray-400 text-sm">{totalCustomers > 0 && `(${totalCustomers} customers)`}</p>
                </div>
                <Button
                    onClick={toggleDraftingHeader}
                    className={`${isNotifyModalOpen ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-[#86efac] text-black hover:bg-[#6ee7b7]"} font-bold gap-2`}
                >
                    {isNotifyModalOpen ? "Cancel Draft" : <><Bell className="w-4 h-4" /> Custom Notification</>}
                    {selectedIds.length > 0 && `(${selectedIds.length})`}
                </Button>
            </div>

            {isNotifyModalOpen && (
                <div className="relative animate-in fade-in slide-in-from-top-4 duration-500 ease-out mb-8">
                    {/* Glowing Top Border Accent */}
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#86efac]/50 to-transparent" />
                    
                    <Card className="bg-[#111111] border-[#333] shadow-2xl overflow-hidden">
                        <CardHeader className="pb-4 bg-gradient-to-b from-[#1a1a1a]/50 to-transparent border-b border-[#333]/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-bold flex items-center gap-3 text-white">
                                    <div className="p-2 rounded-lg bg-[#86efac]/10 border border-[#86efac]/20">
                                        <Send className="w-5 h-5 text-[#86efac]" />
                                    </div>
                                    Draft Custom Notification
                                </CardTitle>
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold
                                        ${selectedIds.length > 0 
                                            ? "bg-[#86efac]/10 border-[#86efac]/30 text-[#86efac]" 
                                            : "bg-yellow-500/5 border-yellow-500/20 text-yellow-500/70 italic"
                                        }`}>
                                        <User className="w-3.5 h-3.5" />
                                        {selectedIds.length} {selectedIds.length === 1 ? "Customer" : "Customers"} Targetted
                                        {selectedIds.length === 0 && " — Select from list"}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={toggleDraftingHeader}
                                        className="text-gray-500 hover:text-white hover:bg-white/5 h-8 w-8 p-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] uppercase text-gray-400 font-bold tracking-[0.1em] ml-1">
                                            Notification Title
                                        </label>
                                        <Input
                                            placeholder="Write a clear, punchy title..."
                                            value={notificationData.title}
                                            onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                                            className="bg-[#0D0D0D] border-[#333] text-white focus-visible:ring-1 focus-visible:ring-[#86efac]/50 h-11 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] uppercase text-gray-400 font-bold tracking-[0.1em] ml-1">
                                            Message Content
                                        </label>
                                        <Textarea
                                            placeholder="What do you want to tell your customers?"
                                            value={notificationData.body}
                                            onChange={(e) => setNotificationData(prev => ({ ...prev, body: e.target.value }))}
                                            className="bg-[#0D0D0D] border-[#333] text-white focus-visible:ring-1 focus-visible:ring-[#86efac]/50 min-h-[140px] transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between p-5 rounded-xl bg-[#0a0a0a] border border-[#333]/50">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Delivery Preview</h4>
                                        <div className="space-y-3 opacity-60 pointer-events-none scale-95 origin-top">
                                            <div className="bg-[#161616] p-3 rounded-lg border border-[#333]">
                                                <div className="h-2 w-20 bg-[#333] rounded mb-2" />
                                                <div className="h-3 w-32 bg-[#444] rounded" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-relaxed italic">
                                            Customers will receive this as a push notification on their registered devices.
                                        </p>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-[#333]/50 mt-6">
                                        <Button
                                            onClick={handleSendNotification}
                                            disabled={isSending || !notificationData.title || !notificationData.body || selectedIds.length === 0}
                                            className="w-full bg-[#86efac] text-black hover:bg-[#a7f3d0] font-black h-14 gap-3 shadow-[0_0_20px_-5px_rgba(134,239,172,0.3)] transition-all active:scale-[0.98]"
                                        >
                                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                            Disfuse Now
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="text" placeholder="Search by name, email, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-[#161616] border-[#333] text-white placeholder:text-gray-500 focus-visible:ring-[#86efac]" />
                </div>
                <Button type="submit" variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">Search</Button>
                {searchQuery && <Button type="button" variant="ghost" onClick={() => { setSearchQuery(""); fetchCustomers(1, true); }} className="text-gray-400 hover:text-white">Clear</Button>}
            </form>

            <Card className="bg-[#161616] border-[#333]">
                <CardHeader>
                    <CardTitle className="text-white">All Customers</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No customers found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                    <TableHead className="text-gray-400">Name</TableHead>
                                    <TableHead className="text-gray-400">Contact</TableHead>
                                    <TableHead className="text-gray-400">Type</TableHead>
                                    <TableHead className="text-gray-400">Business</TableHead>
                                    <TableHead className="text-gray-400 text-right">Joined</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    <TableHead className="text-gray-400 text-right w-10">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 hover:bg-[#333]"
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedIds.length === customers.length && customers.length > 0 ? (
                                                <CheckSquare className="h-4 w-4 text-[#86efac]" />
                                            ) : (
                                                <Square className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.map((cust) => (
                                    <TableRow key={cust._id} className="border-[#333] hover:bg-[#1A1A1A]">
                                        <TableCell className="text-white font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">
                                                    {cust.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                {cust.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400">
                                            <div className="text-xs">{cust.email}</div>
                                            <div className="text-xs">{cust.phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cust.role === 'wholesaler' ? "text-purple-400 border-purple-400" : "text-blue-400 border-blue-400"}>
                                                {cust.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-400 text-sm">
                                            {cust.businessInfo?.businessName || '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-gray-500 text-xs">
                                            {new Date(cust.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-white hover:bg-[#333]"
                                                onClick={() => fetchCustomerDetails(cust._id)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-[#333]"
                                                onClick={() => toggleSelect(cust._id)}
                                            >
                                                {selectedIds.includes(cust._id) ? (
                                                    <CheckSquare className="h-4 w-4 text-[#86efac]" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-[#161616] border-[#333] text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Customer Profile</DialogTitle>
                        <DialogDescription>
                            {selectedCustomer?.name} ({selectedCustomer?.role})
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCustomer && (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0D0D0D] p-4 rounded-lg border border-[#333]">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase mb-1">
                                        <ShoppingBag className="w-3 h-3" /> Total Spend
                                    </div>
                                    <div className="text-2xl font-bold">₹{selectedCustomer.stats?.orders.totalSpent.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">{selectedCustomer.stats?.orders.totalOrders} total orders</div>
                                </div>
                                <div className="bg-[#0D0D0D] p-4 rounded-lg border border-[#333]">
                                    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase mb-1">
                                        <TrendingUp className="w-3 h-3" /> Negotiations
                                    </div>
                                    <div className="text-2xl font-bold">{Object.values(selectedCustomer.stats?.negotiations || {}).reduce((a, b) => a + b, 0)}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        <span className="text-green-500">{selectedCustomer.stats?.negotiations.accepted || 0} accepted</span>
                                        <span className="text-yellow-500">{selectedCustomer.stats?.negotiations.pending || 0} pending</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm bg-[#0D0D0D] p-4 rounded-lg border border-[#333]">
                                <div>
                                    <span className="text-gray-500 block text-xs">Email</span>
                                    {selectedCustomer.email}
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">Phone</span>
                                    {selectedCustomer.phone}
                                </div>
                                {selectedCustomer.businessInfo?.businessName && (
                                    <div className="col-span-2 pt-2 border-t border-[#333] mt-2">
                                        <span className="text-gray-500 block text-xs">Business</span>
                                        <span className="font-medium">{selectedCustomer.businessInfo.businessName}</span>
                                        {selectedCustomer.businessInfo.gstIn && <span className="text-gray-400 text-xs ml-2">GST: {selectedCustomer.businessInfo.gstIn}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Recent Orders */}
                            <div>
                                <h3 className="font-medium mb-3">Recent Orders</h3>
                                <div className="space-y-2">
                                    {selectedCustomer.recentOrders.length === 0 ? (
                                        <div className="text-sm text-gray-500 italic">No orders yet</div>
                                    ) : (
                                        selectedCustomer.recentOrders.map(order => (
                                            <div key={order._id} className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded border border-[#333] text-sm">
                                                <span className="font-mono text-gray-300">{order.orderNumber}</span>
                                                <Badge variant="outline" className="text-xs py-0 h-5 border-gray-700 text-gray-400">
                                                    {order.status.replace('_', ' ')}
                                                </Badge>
                                                <span className="font-bold">₹{order.total.toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Customer Details Modal remains the same */}

            {hasMore && customers.length > 0 && (
                <div className="flex justify-center pt-4">
                    <Button onClick={loadMore} disabled={isLoadingMore} variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] min-w-[200px]">
                        {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : `Load More (${customers.length}/${totalCustomers})`}
                    </Button>
                </div>
            )}
        </div>
    )
}

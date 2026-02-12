"use client"

import { useEffect, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, UserSearch, Phone, Mail, Package, ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react"
import { toast } from "sonner"

interface PotentialCustomer {
    userId: string
    productId: string
    viewCount: number
    lastViewed: string
    user: {
        name: string
        email: string
        phone: string
        businessName?: string
    }
    product: {
        name: string
        sku?: string
        price: number
        stock: number
        image?: string
    }
}

interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
}

export default function PotentialCustomersPage() {
    const [leads, setLeads] = useState<PotentialCustomer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [period, setPeriod] = useState("7d")
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, pages: 0 })

    useEffect(() => {
        fetchLeads(1)
    }, [period])

    async function fetchLeads(page: number) {
        setIsLoading(true)
        try {
            const res = await fetch(
                `http://localhost:5000/api/v1/admin/analytics/potential-customers?period=${period}&page=${page}&limit=30`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                }
            )
            const data = await res.json()
            if (res.ok && data.success) {
                setLeads(data.data.potentialCustomers || [])
                setPagination(data.data.pagination)
            } else {
                toast.error("Failed to fetch potential customers")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
        }
    }

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / (1000 * 60))
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(diff / (1000 * 60 * 60))
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    function formatPrice(price: number) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)
    }

    const periods = [
        { value: "3d", label: "Last 3 days" },
        { value: "7d", label: "Last 7 days" },
        { value: "14d", label: "Last 14 days" },
        { value: "30d", label: "Last 30 days" },
    ]

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Potential Customers</h1>
                    <p className="text-sm text-[#919191] mt-1">
                        Users who viewed products but didn&apos;t add to cart or purchase within 6 hours
                    </p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-[#161616] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#86efac] cursor-pointer"
                >
                    {periods.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0D0D0D] rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-orange-500/10">
                        <UserSearch className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white">{pagination.total}</p>
                        <p className="text-xs text-[#919191]">Total Leads</p>
                    </div>
                </div>
                <div className="bg-[#0D0D0D] rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10">
                        <Eye className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white">
                            {leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.viewCount, 0) / leads.length) : 0}
                        </p>
                        <p className="text-xs text-[#919191]">Avg. Views per Lead</p>
                    </div>
                </div>
                <div className="bg-[#0D0D0D] rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-green-500/10">
                        <TrendingUp className="h-5 w-5 text-[#86efac]" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white">
                            {leads.filter(l => l.viewCount >= 3).length}
                        </p>
                        <p className="text-xs text-[#919191]">High Interest (3+ views)</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#161616] border border-[#333] rounded-2xl">
                <div className="px-6 py-4 border-b border-[#333]">
                    <h2 className="text-lg font-semibold text-white">Lead Details</h2>
                </div>
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="text-center py-16">
                            <UserSearch className="h-12 w-12 mx-auto mb-3 text-[#333]" />
                            <p className="font-medium text-gray-400">No potential customers found</p>
                            <p className="text-sm text-[#919191] mt-1">All viewers have converted or the window hasn&apos;t elapsed yet</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                        <TableHead className="text-gray-400">Customer</TableHead>
                                        <TableHead className="text-gray-400">Product Viewed</TableHead>
                                        <TableHead className="text-gray-400 text-center">Views</TableHead>
                                        <TableHead className="text-gray-400">Last Viewed</TableHead>
                                        <TableHead className="text-gray-400">Stock</TableHead>
                                        <TableHead className="text-gray-400">Interest</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.map((lead, i) => (
                                        <TableRow key={`${lead.userId}-${lead.productId}-${i}`} className="border-[#333] hover:bg-[#1A1A1A]">
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-sm text-white">{lead.user.name}</p>
                                                    {lead.user.businessName && (
                                                        <p className="text-xs text-[#919191]">{lead.user.businessName}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        {lead.user.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {lead.user.phone}
                                                            </span>
                                                        )}
                                                        {lead.user.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {lead.user.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {lead.product.image ? (
                                                        <img
                                                            src={lead.product.image}
                                                            alt={lead.product.name}
                                                            className="w-10 h-10 rounded-md object-cover border border-[#333]"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-md bg-[#1A1A1A] flex items-center justify-center border border-[#333]">
                                                            <Package className="h-4 w-4 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-white line-clamp-1">{lead.product.name}</p>
                                                        <p className="text-xs text-[#919191]">{formatPrice(lead.product.price)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-semibold text-sm text-white">{lead.viewCount}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Clock className="h-3 w-3" />
                                                    {timeAgo(lead.lastViewed)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lead.product.stock === 0 ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-500/10">Out of stock</span>
                                                ) : lead.product.stock <= 10 ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-yellow-400 bg-yellow-500/10">{lead.product.stock} left</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-400 bg-gray-500/10">{lead.product.stock} left</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {lead.viewCount >= 5 ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-500/10">Hot</span>
                                                ) : lead.viewCount >= 3 ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-orange-400 bg-orange-500/10">Warm</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-400 bg-blue-500/10">Browsing</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#333]">
                                    <p className="text-sm text-[#919191]">
                                        Page {pagination.page} of {pagination.pages} ({pagination.total} leads)
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-[#333]"
                                            disabled={pagination.page <= 1}
                                            onClick={() => fetchLeads(pagination.page - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-[#333]"
                                            disabled={pagination.page >= pagination.pages}
                                            onClick={() => fetchLeads(pagination.page + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

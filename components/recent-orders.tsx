"use client"

import { useEffect, useState } from 'react'
import { ArrowUpRight, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Order {
    _id: string
    orderNumber: string
    customerSnapshot: { name: string }
    total: number
    status: string
    createdAt: string
    payment?: { status: string }
}

export function RecentOrders() {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchOrders() {
            try {
                const res = await fetch('http://localhost:5000/api/v1/admin/orders?limit=6', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                })
                const json = await res.json()
                if (res.ok) {
                    setOrders((json.data || []).slice(0, 6))
                }
            } catch {
                // keep empty
            } finally {
                setIsLoading(false)
            }
        }
        fetchOrders()
    }, [])

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    function getStatusStyle(status: string) {
        switch (status) {
            case 'delivered': return 'bg-green-500/10 text-green-500'
            case 'payment_verified': return 'bg-green-500/10 text-green-500'
            case 'processing': return 'bg-blue-500/10 text-blue-500'
            case 'shipped': return 'bg-purple-500/10 text-purple-500'
            case 'payment_uploaded': return 'bg-blue-500/10 text-blue-500'
            case 'pending_payment': return 'bg-yellow-500/10 text-yellow-500'
            case 'cancelled': return 'bg-red-500/10 text-red-500'
            default: return 'bg-gray-500/10 text-gray-500'
        }
    }

    function formatStatus(status: string) {
        return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }

    const getPaymentStatus = (order: Order) => {
        if (!order.payment) return order.status === 'pending_payment' ? 'pending' : 'unknown'
        return order.payment.status
    }

    return (
        <div className="bg-[#0D0D0D] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Recent Orders</h3>
                <Link href="/orders" className="text-sm text-[#86efac] flex items-center gap-1 hover:underline">
                    View All <ArrowUpRight className="h-4 w-4" />
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[#86efac]" />
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No orders yet</div>
            ) : (
                <table className="w-full">
                    <thead>
                        <tr className="text-[#919191] text-sm border-b border-[#1F1F1F]">
                            <th className="pb-4 text-left font-medium pl-2">Order ID</th>
                            <th className="pb-4 text-left font-medium">Customer</th>
                            <th className="pb-4 text-left font-medium">Date</th>
                            <th className="pb-4 text-right font-medium">Amount</th>
                            <th className="pb-4 text-center font-medium">Status</th>
                            <th className="pb-4 text-center font-medium pr-2">Payment</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {orders.map((order) => {
                            const payStatus = getPaymentStatus(order)
                            return (
                                <tr
                                    key={order._id}
                                    className="group hover:bg-[#1A1A1A] transition-colors border-b border-[#1F1F1F] last:border-0"
                                >
                                    <td className="py-4 pl-2 text-white font-medium">{order.orderNumber}</td>
                                    <td className="py-4 text-[#E7E7E7]">{order.customerSnapshot?.name || '—'}</td>
                                    <td className="py-4 text-[#919191]">{formatDate(order.createdAt)}</td>
                                    <td className="py-4 text-right text-white font-bold">₹{order.total.toLocaleString('en-IN')}</td>
                                    <td className="py-4">
                                        <div className="flex justify-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                                                {formatStatus(order.status)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 pr-2">
                                        <div className="flex items-center justify-center gap-2">
                                            {payStatus === 'verified' ? (
                                                <div className="flex items-center gap-1 text-[#86efac]">
                                                    <CheckCircle2 className="h-4 w-4" /> Verified
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <Clock className="h-4 w-4" /> {formatStatus(payStatus)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    )
}

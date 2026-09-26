"use client"

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

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
    const fetchedRef = useRef(false)

    useEffect(() => {
        if (fetchedRef.current) return
        fetchedRef.current = true

        async function fetchOrders() {
            try {
                const res = await apiFetch('/admin/orders?limit=6')
                const contentType = res.headers.get('content-type') || ''
                if (!contentType.includes('application/json')) {
                    return
                }

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

    return (
        <section className="admin-card recent-orders-panel h-full min-h-[560px] rounded-[1.4rem] border p-5 sm:p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
                <div><p className="dashboard-eyebrow">Operations</p><h3 className="admin-heading mt-1.5 text-xl font-bold tracking-tight">Recent orders</h3></div>
                <Link href="/orders" className="dashboard-accent flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline">
                    View all <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="dashboard-accent h-6 w-6 animate-spin" />
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No orders yet</div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="border-b border-[var(--admin-border)] text-[11px] text-[var(--admin-muted)]">
                            <th className="w-[32%] pb-3 text-left font-medium">Order</th>
                            <th className="order-customer w-[27%] pb-3 text-left font-medium">Customer</th>
                            <th className="w-[18%] pb-3 text-right font-medium">Amount</th>
                            <th className="w-[23%] pb-3 text-right font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {orders.map((order) => {
                            return (
                                <tr
                                    key={order._id}
                                    className="group border-b border-[var(--admin-border)] transition-colors last:border-0 hover:bg-[var(--admin-surface-inset)]"
                                >
                                    <td className="py-4 pr-3"><span className="admin-heading block text-xs font-semibold">{order.orderNumber}</span><span className="admin-muted mt-1 block text-[11px]">{formatDate(order.createdAt)}</span></td>
                                    <td className="admin-heading order-customer py-4 pr-3 text-xs">{order.customerSnapshot?.name || '—'}</td>
                                    <td className="admin-heading whitespace-nowrap py-4 pr-3 text-right text-xs font-bold">₹{order.total.toLocaleString('en-IN')}</td>
                                    <td className="py-4 text-right">
                                        <div className="flex justify-end">
                                            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusStyle(order.status)}`}>
                                                 {formatStatus(order.status)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                </div>
            )}
        </section>
    )
}

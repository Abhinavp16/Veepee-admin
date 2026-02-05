"use client"

import { ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react'

const orders = [
    {
        orderId: "ORD-2024-1001",
        customer: "Ramesh Kumar",
        date: "2024-02-04",
        amount: "₹12,500",
        status: "Processing",
        payment: "Verified",
    },
    {
        orderId: "ORD-2024-1002",
        customer: "Swastik Agro",
        date: "2024-02-04",
        amount: "₹1,45,000",
        status: "Pending",
        payment: "Pending",
    },
    {
        orderId: "ORD-2024-0998",
        customer: "Amit Singh",
        date: "2024-02-03",
        amount: "₹850",
        status: "Delivered",
        payment: "Verified",
    },
    {
        orderId: "ORD-2024-0995",
        customer: "Kisan Seva Kendra",
        date: "2024-02-02",
        amount: "₹8,20,000",
        status: "Shipped",
        payment: "Verified",
    },
]

export function RecentOrders() {
    return (
        <div className="bg-[#0D0D0D] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Recent Orders</h3>
                <button className="text-sm text-[#86efac] flex items-center gap-1 hover:underline">
                    View All <ArrowUpRight className="h-4 w-4" />
                </button>
            </div>

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
                    {orders.map((order) => (
                        <tr
                            key={order.orderId}
                            className="group hover:bg-[#1A1A1A] transition-colors border-b border-[#1F1F1F] last:border-0"
                        >
                            <td className="py-4 pl-2 text-white font-medium">{order.orderId}</td>
                            <td className="py-4 text-[#E7E7E7]">{order.customer}</td>
                            <td className="py-4 text-[#919191]">{order.date}</td>
                            <td className="py-4 text-right text-white font-bold">{order.amount}</td>
                            <td className="py-4">
                                <div className="flex justify-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium 
                    ${order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' :
                                            order.status === 'Processing' ? 'bg-blue-500/10 text-blue-500' :
                                                order.status === 'Shipped' ? 'bg-purple-500/10 text-purple-500' :
                                                    'bg-yellow-500/10 text-yellow-500'}`}>
                                        {order.status}
                                    </span>
                                </div>
                            </td>
                            <td className="py-4 pr-2">
                                <div className="flex items-center justify-center gap-2">
                                    {order.payment === 'Verified' ? (
                                        <div className="flex items-center gap-1 text-[#86efac]">
                                            <CheckCircle2 className="h-4 w-4" /> Verified
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-yellow-500">
                                            <Clock className="h-4 w-4" /> Pending
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

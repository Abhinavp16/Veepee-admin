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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, User, ShoppingBag, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

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
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    useEffect(() => {
        fetchCustomers()
    }, [])

    async function fetchCustomers() {
        try {
            const res = await fetch('http://localhost:5000/api/v1/admin/customers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            const data = await res.json()
            if (res.ok) {
                setCustomers(data.data || [])
            } else {
                toast.error("Failed to fetch customers")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
        }
    }

    async function fetchCustomerDetails(id: string) {
        try {
            const res = await fetch(`http://localhost:5000/api/v1/admin/customers/${id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            const data = await res.json()
            if (res.ok) {
                // Backend returns data flattened with stats?
                // The controller spreads ...customer (which is an object with _doc or similar if lean() wasn't used properly on findById)
                // Wait, getCustomerById does NOT use .lean(). So ...customer might include Mongoose internals if not careful.
                // But res.json handles it usually.
                setSelectedCustomer(data.data)
                setIsDetailsOpen(true)
            }
        } catch (error) {
            toast.error("Failed to load details")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold text-white">Customers</h1>

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
        </div>
    )
}

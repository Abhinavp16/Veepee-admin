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
import { Loader2, Eye, Truck, CheckCircle2, XCircle, Package, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import Image from "next/image"
import { apiFetch } from "@/lib/api"

interface Order {
    _id: string
    orderNumber: string
    items: { productSnapshot: { name: string }; quantity: number; pricePerUnit: number }[]
    customerSnapshot: { name: string; email: string; phone: string }
    total: number
    status: string
    createdAt: string
    trackingNumber?: string
    courierName?: string
    shippingAddress?: { address: string; city: string; state: string; pincode: string }
    statusHistory?: { status: string; note?: string; timestamp: string }[]
    payment?: {
        _id: string
        amount: number
        upiId: string
        screenshotUrl: string
        status: string
    }
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [isdetailsOpen, setIsDetailsOpen] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [isShipDialogOpen, setIsShipDialogOpen] = useState(false)
    const [trackingNumber, setTrackingNumber] = useState("")
    const [courierName, setCourierName] = useState("")
    const [isShipping, setIsShipping] = useState(false)

    useEffect(() => {
        fetchOrders()
    }, [])

    async function fetchOrders() {
        try {
            const res = await apiFetch('/admin/orders')
            const data = await res.json()
            if (res.ok) {
                setOrders(data.data || [])
            } else {
                toast.error("Failed to fetch orders")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
        }
    }

    async function fetchOrderDetails(id: string) {
        try {
            const res = await apiFetch(`/admin/orders/${id}`)
            const data = await res.json()
            if (res.ok) {
                setSelectedOrder(data.data)
                setIsDetailsOpen(true)
            }
        } catch (error) {
            toast.error("Failed to load details")
        }
    }

    async function handleVerifyPayment(paymentId: string) {
        if (!confirm("Are you sure you want to verify this payment?")) return
        setIsVerifying(true)
        try {
            const res = await apiFetch(`/admin/payments/${paymentId}/verify`, {
                method: 'PUT',
            })
            if (res.ok) {
                toast.success("Payment verified successfully")
                setIsDetailsOpen(false)
                fetchOrders()
            } else {
                const data = await res.json()
                toast.error(data.message || "Verification failed")
            }
        } catch (error) {
            toast.error("Error processing request")
        } finally {
            setIsVerifying(false)
        }
    }

    async function handleRejectPayment(paymentId: string) {
        const reason = prompt("Enter rejection reason:")
        if (!reason) return
        setIsRejecting(true)
        try {
            const res = await apiFetch(`/admin/payments/${paymentId}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ reason })
            })
            if (res.ok) {
                toast.success("Payment rejected")
                setIsDetailsOpen(false)
                fetchOrders()
            } else {
                const data = await res.json()
                toast.error(data.message || "Rejection failed")
            }
        } catch (error) {
            toast.error("Error processing request")
        } finally {
            setIsRejecting(false)
        }
    }

    async function updateOrderStatus(orderId: string, status: string, note?: string) {
        setIsUpdatingStatus(true)
        try {
            const res = await apiFetch(`/admin/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, note })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Order ${status.replace(/_/g, ' ')}`)
                setIsDetailsOpen(false)
                fetchOrders()
            } else {
                toast.error(data.message || 'Failed to update status')
            }
        } catch {
            toast.error('Error updating order status')
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    async function shipOrder(orderId: string) {
        if (!trackingNumber.trim() || !courierName.trim()) {
            toast.error('Please enter tracking number and courier name')
            return
        }
        setIsShipping(true)
        try {
            const res = await apiFetch(`/admin/orders/${orderId}/ship`, {
                method: 'PUT',
                body: JSON.stringify({ trackingNumber: trackingNumber.trim(), courierName: courierName.trim() })
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Order shipped!')
                setIsShipDialogOpen(false)
                setIsDetailsOpen(false)
                setTrackingNumber('')
                setCourierName('')
                fetchOrders()
            } else {
                toast.error(data.message || 'Failed to ship order')
            }
        } catch {
            toast.error('Error shipping order')
        } finally {
            setIsShipping(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered': return "text-green-500 bg-green-500/10"
            case 'payment_verified': return "text-green-500 bg-green-500/10"
            case 'payment_uploaded': return "text-blue-500 bg-blue-500/10"
            case 'processing': return "text-blue-500 bg-blue-500/10"
            case 'shipped': return "text-purple-500 bg-purple-500/10"
            case 'pending_payment': return "text-yellow-500 bg-yellow-500/10"
            default: return "text-gray-500 bg-gray-500/10"
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold text-white">Orders</h1>

            <Card className="bg-[#161616] border-[#333]">
                <CardHeader>
                    <CardTitle className="text-white">All Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No orders found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                    <TableHead className="text-gray-400">Order #</TableHead>
                                    <TableHead className="text-gray-400">Customer</TableHead>
                                    <TableHead className="text-gray-400">Items</TableHead>
                                    <TableHead className="text-gray-400 text-right">Total</TableHead>
                                    <TableHead className="text-gray-400 text-center">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order._id} className="border-[#333] hover:bg-[#1A1A1A]">
                                        <TableCell className="text-white font-medium">{order.orderNumber}</TableCell>
                                        <TableCell className="text-white font-medium">{order.customerSnapshot?.name}</TableCell>
                                        <TableCell className="text-gray-400 text-xs">
                                            {order.items.length} items ({order.items[0]?.productSnapshot.name}...)
                                        </TableCell>
                                        <TableCell className="text-white text-right font-bold">₹{order.total.toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(order.status)}`}>
                                                {order.status.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-white hover:bg-[#333]"
                                                onClick={() => fetchOrderDetails(order._id)}
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

            <Dialog open={isdetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-[#161616] border-[#333] text-white max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Order Details: {selectedOrder?.orderNumber}</DialogTitle>
                        <DialogDescription>
                            Customer: {selectedOrder?.customerSnapshot?.name} | {selectedOrder?.customerSnapshot?.phone}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6 overflow-y-auto pr-2" style={{ maxHeight: 'calc(85vh - 100px)' }}>
                            {/* Payment Section */}
                            <div className="p-4 bg-[#0D0D0D] rounded-lg border border-[#333]">
                                <h3 className="font-medium mb-2 flex items-center gap-2">
                                    Payment Information
                                    {selectedOrder.status === 'payment_verified' && <div className="text-green-500 flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3" /> Verified</div>}
                                </h3>

                                {selectedOrder.payment ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-400 block">Amount</span>
                                                <span>₹{selectedOrder.payment.amount}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block">UPI ID</span>
                                                <span>{selectedOrder.payment.upiId}</span>
                                            </div>
                                        </div>

                                        {selectedOrder.payment.screenshotUrl && (
                                            <div>
                                                <span className="text-gray-400 block mb-2 text-sm">Payment Screenshot</span>
                                                <div className="relative aspect-video w-full rounded-md overflow-hidden border border-[#333]">
                                                    {/* Using standard img tag for external URLs if standard domain not configured in next.config */}
                                                    <img
                                                        src={selectedOrder.payment.screenshotUrl}
                                                        alt="Payment Proof"
                                                        className="object-contain w-full h-full bg-black/50"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {selectedOrder.status === 'payment_uploaded' && (
                                            <div className="flex gap-3 pt-2">
                                                <Button
                                                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                                                    onClick={() => selectedOrder.payment && handleVerifyPayment(selectedOrder.payment._id)}
                                                    disabled={isVerifying}
                                                >
                                                    {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Verify Payment
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="w-full"
                                                    onClick={() => selectedOrder.payment && handleRejectPayment(selectedOrder.payment._id)}
                                                    disabled={isRejecting}
                                                >
                                                    {isRejecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-yellow-500 text-sm">No payment information uploaded yet.</div>
                                )}
                            </div>

                            {/* Items List */}
                            <div>
                                <h3 className="font-medium mb-2">Items</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded border border-[#333]">
                                            <span>{item.productSnapshot.name}</span>
                                            <span className="text-gray-400">x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Shipping Address */}
                            {selectedOrder.shippingAddress && (
                                <div className="p-4 bg-[#0D0D0D] rounded-lg border border-[#333]">
                                    <h3 className="font-medium mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" /> Shipping Address
                                    </h3>
                                    <p className="text-sm text-gray-300">
                                        {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pincode}
                                    </p>
                                </div>
                            )}

                            {/* Tracking Info */}
                            {selectedOrder.trackingNumber && (
                                <div className="p-4 bg-[#0D0D0D] rounded-lg border border-[#333]">
                                    <h3 className="font-medium mb-2 flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-gray-400" /> Shipping Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400 block">Courier</span>
                                            <span>{selectedOrder.courierName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">Tracking #</span>
                                            <span className="font-mono">{selectedOrder.trackingNumber}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status History */}
                            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                                <div className="p-4 bg-[#0D0D0D] rounded-lg border border-[#333]">
                                    <h3 className="font-medium mb-3">Status History</h3>
                                    <div className="space-y-2">
                                        {selectedOrder.statusHistory.slice().reverse().map((h, idx) => (
                                            <div key={idx} className="flex items-start gap-3 text-sm">
                                                <div className="w-2 h-2 mt-1.5 rounded-full bg-[#86efac] shrink-0" />
                                                <div>
                                                    <span className="text-white capitalize">{h.status.replace(/_/g, ' ')}</span>
                                                    {h.note && <span className="text-gray-500 ml-2">— {h.note}</span>}
                                                    <p className="text-xs text-gray-600">{new Date(h.timestamp).toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status Actions */}
                            {selectedOrder.status === 'payment_verified' && (
                                <div className="flex flex-col gap-3">
                                    <Button
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => updateOrderStatus(selectedOrder._id, 'processing', 'Order confirmed by admin')}
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        <Package className="w-4 h-4 mr-2" /> Confirm & Process
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => updateOrderStatus(selectedOrder._id, 'cancelled', 'Cancelled by admin')}
                                        disabled={isUpdatingStatus}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                                    </Button>
                                </div>
                            )}

                            {selectedOrder.status === 'processing' && (
                                <div className="flex flex-col gap-3">
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                            setTrackingNumber('')
                                            setCourierName('')
                                            setIsShipDialogOpen(true)
                                        }}
                                        disabled={isUpdatingStatus}
                                    >
                                        <Truck className="w-4 h-4 mr-2" /> Ship Order
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => updateOrderStatus(selectedOrder._id, 'cancelled', 'Cancelled by admin')}
                                        disabled={isUpdatingStatus}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                                    </Button>
                                </div>
                            )}

                            {selectedOrder.status === 'shipped' && (
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => updateOrderStatus(selectedOrder._id, 'delivered', 'Marked as delivered')}
                                    disabled={isUpdatingStatus}
                                >
                                    {isUpdatingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Delivered
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Ship Order Dialog */}
            <Dialog open={isShipDialogOpen} onOpenChange={setIsShipDialogOpen}>
                <DialogContent className="bg-[#161616] border-[#333] text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ship Order: {selectedOrder?.orderNumber}</DialogTitle>
                        <DialogDescription>
                            Enter courier and tracking details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Courier Name</Label>
                            <Input
                                placeholder="e.g. BlueDart, Delhivery, DTDC"
                                value={courierName}
                                onChange={(e) => setCourierName(e.target.value)}
                                className="bg-[#0D0D0D] border-[#333] text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Tracking Number</Label>
                            <Input
                                placeholder="e.g. AWB123456789"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="bg-[#0D0D0D] border-[#333] text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsShipDialogOpen(false)} className="text-gray-400 hover:bg-[#333]">
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => selectedOrder && shipOrder(selectedOrder._id)}
                            disabled={isShipping}
                        >
                            {isShipping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Truck className="w-4 h-4 mr-2" /> Confirm Shipment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

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
import { Loader2, Eye, Truck, CheckCircle2, XCircle, Package, MapPin, Search } from "lucide-react"
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
import { TableSkeleton } from "@/components/table-skeleton"
import { apiFetch } from "@/lib/api"

interface Order {
    _id: string
    orderNumber: string
    items: { productSnapshot: { name: string }; quantity: number; pricePerUnit: number }[]
    customerSnapshot: { name: string; email: string; phone: string }
    subtotal?: number
    deliveryFee?: number
    discount?: number
    // Given by the shop at confirmation, on top of any coupon.
    extraDiscount?: number
    extraDiscountPercent?: number | null
    total: number
    status: string
    // New orders wait for the shop to add delivery and confirm them.
    confirmationStatus?: 'pending' | 'confirmed' | 'rejected' | null
    confirmationNote?: string | null
    createdAt: string
    trackingNumber?: string
    courierName?: string
    shippingAddress?: { fullName?: string; phone?: string; addressLine1?: string; address?: string; city: string; state: string; pincode: string }
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
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [isdetailsOpen, setIsDetailsOpen] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [isShipDialogOpen, setIsShipDialogOpen] = useState(false)
    const [trackingNumber, setTrackingNumber] = useState("")
    const [courierName, setCourierName] = useState("")
    const [isShipping, setIsShipping] = useState(false)

    // Search & Pagination state
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalOrders, setTotalOrders] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [onlyAwaiting, setOnlyAwaiting] = useState(false)

    // Confirming a new order: delivery charge or rejection reason.
    const [deliveryCharge, setDeliveryCharge] = useState("")
    // Optional extra discount, in rupees or as a % of the products.
    const [extraDiscount, setExtraDiscount] = useState("")
    const [extraDiscountType, setExtraDiscountType] = useState<'amount' | 'percent'>('amount')
    const [rejectReason, setRejectReason] = useState("")
    const [isRejectingOrder, setIsRejectingOrder] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)

    useEffect(() => {
        fetchOrders(1, true)
    }, [onlyAwaiting])

    async function fetchOrders(pageNum: number = 1, reset: boolean = false) {
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
            if (onlyAwaiting) params.append('confirmation', 'pending')

            const res = await apiFetch(`/admin/orders?${params.toString()}`)
            const data = await res.json()
            if (res.ok) {
                const items = data.data || []
                const pagination = data.pagination || {}

                if (reset || pageNum === 1) {
                    setOrders(items)
                } else {
                    setOrders(prev => [...prev, ...items])
                }

                setTotalPages(pagination.totalPages || 1)
                setTotalOrders(pagination.total || items.length)
                setHasMore((pagination.page || 1) < (pagination.totalPages || 1))
            } else {
                toast.error("Failed to fetch orders")
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
        fetchOrders(1, true)
    }, [searchQuery])

    const loadMore = useCallback(() => {
        if (hasMore && !isLoadingMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchOrders(nextPage, false)
        }
    }, [hasMore, isLoadingMore, page])

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

    /** What the customer will pay with the delivery charge and extra discount entered. */
    function confirmationPreview(order: Order) {
        const round2 = (value: number) => Math.round(value * 100) / 100
        const subtotal = order.subtotal ?? order.total
        const coupon = order.discount || 0
        const delivery = Math.max(Number(deliveryCharge) || 0, 0)
        const value = Math.max(Number(extraDiscount) || 0, 0)
        const extra = extraDiscountType === 'percent'
            ? round2((Math.max(subtotal - coupon, 0) * value) / 100)
            : round2(value)
        const maxExtra = round2(Math.max(subtotal + delivery - coupon, 0))
        const error = extraDiscountType === 'percent' && value > 100
            ? "The extra discount can be at most 100%"
            : extra > maxExtra
                ? `The extra discount can be at most ₹${maxExtra.toLocaleString('en-IN')}`
                : null
        return { subtotal, coupon, delivery, extra, error, total: round2(Math.max(subtotal + delivery - coupon - extra, 0)) }
    }

    async function handleConfirmOrder(order: Order) {
        const charge = Number(deliveryCharge)
        if (deliveryCharge.trim() === "" || !Number.isFinite(charge) || charge < 0) {
            toast.error("Enter the delivery charge (0 for free delivery)")
            return
        }
        const discountValue = Number(extraDiscount) || 0
        if (!Number.isFinite(discountValue) || discountValue < 0) {
            toast.error("Enter a valid extra discount (or leave it empty)")
            return
        }
        const preview = confirmationPreview(order)
        if (preview.error) {
            toast.error(preview.error)
            return
        }
        setIsConfirming(true)
        try {
            const res = await apiFetch(`/admin/orders/${order._id}/confirm`, {
                method: "PUT",
                body: JSON.stringify({ deliveryCharge: charge, extraDiscount: discountValue, extraDiscountType }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Order confirmed. The customer will pay ₹${Number(data.data?.total ?? 0).toLocaleString('en-IN')}.`)
                setDeliveryCharge("")
                setExtraDiscount("")
                setExtraDiscountType('amount')
                await fetchOrderDetails(order._id)
                fetchOrders(1, true)
            } else {
                toast.error(data.message || "Could not confirm the order")
            }
        } catch {
            toast.error("Error connecting to server")
        } finally {
            setIsConfirming(false)
        }
    }

    async function handleRejectOrder(order: Order) {
        if (!rejectReason.trim()) {
            toast.error("Tell the customer why the order is not confirmed")
            return
        }
        setIsConfirming(true)
        try {
            const res = await apiFetch(`/admin/orders/${order._id}/reject`, {
                method: "PUT",
                body: JSON.stringify({ reason: rejectReason.trim() }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success("Order rejected. The customer has been told why.")
                setRejectReason("")
                setIsRejectingOrder(false)
                await fetchOrderDetails(order._id)
                fetchOrders(1, true)
            } else {
                toast.error(data.message || "Could not reject the order")
            }
        } catch {
            toast.error("Error connecting to server")
        } finally {
            setIsConfirming(false)
        }
    }

    const statusLabel = (order: Order) =>
        order.confirmationStatus === 'pending' ? 'awaiting confirmation' : order.status.replace(/_/g, ' ')

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered': return "text-green-500 bg-green-500/10"
            case 'payment_verified': return "text-green-500 bg-green-500/10"
            case 'payment_uploaded': return "text-blue-500 bg-blue-500/10"
            case 'processing': return "text-blue-500 bg-blue-500/10"
            case 'shipped': return "text-purple-500 bg-purple-500/10"
            case 'pending_payment': return "text-yellow-500 bg-yellow-500/10"
            case 'awaiting confirmation': return "text-orange-400 bg-orange-500/10"
            default: return "text-gray-500 bg-gray-500/10"
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Orders</h1>
                    <p className="text-gray-400 text-sm">{totalOrders > 0 && `(${totalOrders} orders)`}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnlyAwaiting(false)}
                    className={!onlyAwaiting ? "border-[#86efac] bg-[#86efac]/10 text-[#86efac]" : "border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"}
                >
                    All orders
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOnlyAwaiting(true)}
                    className={onlyAwaiting ? "border-orange-400 bg-orange-500/10 text-orange-400" : "border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"}
                >
                    Awaiting confirmation
                </Button>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by order number, customer name, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-[#161616] border-[#333] text-white placeholder:text-gray-500 focus-visible:ring-[#86efac]"
                    />
                </div>
                <Button
                    type="submit"
                    variant="outline"
                    className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                >
                    Search
                </Button>
                {searchQuery && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setSearchQuery("")
                            fetchOrders(1, true)
                        }}
                        className="text-gray-400 hover:text-white"
                    >
                        Clear
                    </Button>
                )}
            </form>

            <Card className="bg-[#161616] border-[#333]">
                <CardHeader>
                    <CardTitle className="text-white">All Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <TableSkeleton columns={6} />
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(order.confirmationStatus === 'pending' ? 'awaiting confirmation' : order.status)}`}>
                                                {statusLabel(order)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-white hover:bg-[#333]"
                                                onClick={() => {
                                                    setDeliveryCharge("")
                                                    setRejectReason("")
                                                    setIsRejectingOrder(false)
                                                    fetchOrderDetails(order._id)
                                                }}
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
                            {/* Confirm the order and add delivery before the customer pays */}
                            {selectedOrder.confirmationStatus === 'pending' && selectedOrder.status === 'pending_payment' && (
                                <div className="p-4 rounded-lg border border-orange-500/40 bg-orange-500/5 space-y-3">
                                    <div>
                                        <h3 className="font-medium text-orange-300">Awaiting confirmation</h3>
                                        <p className="text-xs text-gray-400">Add the delivery charge for this address and any extra discount, then confirm. The customer can pay only after that. The discount can&apos;t be changed later.</p>
                                    </div>
                                    {(() => {
                                        const preview = confirmationPreview(selectedOrder)
                                        const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`
                                        return (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label htmlFor="deliveryCharge" className="text-gray-300">Delivery charge (₹)</Label>
                                                        <Input
                                                            id="deliveryCharge"
                                                            type="number"
                                                            min={0}
                                                            inputMode="decimal"
                                                            placeholder="0 for free delivery"
                                                            value={deliveryCharge}
                                                            onChange={(e) => setDeliveryCharge(e.target.value)}
                                                            className="bg-[#0D0D0D] border-[#333] text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="extraDiscount" className="text-gray-300">Extra discount (optional)</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id="extraDiscount"
                                                                type="number"
                                                                min={0}
                                                                max={extraDiscountType === 'percent' ? 100 : undefined}
                                                                inputMode="decimal"
                                                                placeholder="0"
                                                                value={extraDiscount}
                                                                onChange={(e) => setExtraDiscount(e.target.value)}
                                                                className="bg-[#0D0D0D] border-[#333] text-white"
                                                            />
                                                            <div className="flex rounded-md border border-[#333] overflow-hidden shrink-0" role="group" aria-label="Discount in rupees or percent">
                                                                {(['amount', 'percent'] as const).map((type) => (
                                                                    <button
                                                                        key={type}
                                                                        type="button"
                                                                        aria-pressed={extraDiscountType === type}
                                                                        onClick={() => setExtraDiscountType(type)}
                                                                        className={`px-3 text-sm font-semibold ${extraDiscountType === type ? 'bg-[#86efac] text-black' : 'bg-[#0D0D0D] text-gray-300'}`}
                                                                    >
                                                                        {type === 'amount' ? '₹' : '%'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="rounded-md bg-[#0D0D0D] border border-[#333] p-3 text-sm space-y-1">
                                                    <div className="flex justify-between text-gray-400"><span>Products</span><span>{rupees(preview.subtotal)}</span></div>
                                                    {preview.coupon > 0 && (
                                                        <div className="flex justify-between text-gray-400"><span>Coupon discount</span><span>−{rupees(preview.coupon)}</span></div>
                                                    )}
                                                    <div className="flex justify-between text-gray-400"><span>Delivery</span><span>+{rupees(preview.delivery)}</span></div>
                                                    {preview.extra > 0 && (
                                                        <div className="flex justify-between text-[#86efac]">
                                                            <span>Extra discount{extraDiscountType === 'percent' ? ` (${Number(extraDiscount)}%)` : ''}</span>
                                                            <span>−{rupees(preview.extra)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between border-t border-[#333] pt-1 font-bold text-white text-base">
                                                        <span>Customer will pay</span><span>{rupees(preview.total)}</span>
                                                    </div>
                                                    {preview.error && <p role="alert" className="text-xs text-red-400">{preview.error}</p>}
                                                </div>
                                            </>
                                        )
                                    })()}
                                    {isRejectingOrder ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="rejectReason" className="text-gray-300">Reason (sent to the customer)</Label>
                                            <Input
                                                id="rejectReason"
                                                placeholder="e.g. We do not deliver to this pincode"
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                className="bg-[#0D0D0D] border-[#333] text-white"
                                            />
                                            <div className="flex gap-3">
                                                <Button variant="outline" className="flex-1 border-[#333] bg-[#0D0D0D] text-white" onClick={() => setIsRejectingOrder(false)} disabled={isConfirming}>
                                                    Back
                                                </Button>
                                                <Button variant="destructive" className="flex-1" onClick={() => handleRejectOrder(selectedOrder)} disabled={isConfirming}>
                                                    {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Reject order
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleConfirmOrder(selectedOrder)} disabled={isConfirming}>
                                                {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Confirm order
                                            </Button>
                                            <Button variant="destructive" className="flex-1" onClick={() => setIsRejectingOrder(true)} disabled={isConfirming}>
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedOrder.confirmationStatus === 'rejected' && selectedOrder.confirmationNote && (
                                <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/5 text-sm text-red-300">
                                    Not confirmed: {selectedOrder.confirmationNote}
                                </div>
                            )}
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
                                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                                                    onClick={() => selectedOrder.payment && handleVerifyPayment(selectedOrder.payment._id)}
                                                    disabled={isVerifying}
                                                >
                                                    {isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Verify Payment
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="flex-1"
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
                                        <div key={idx} className="flex justify-between items-center gap-3 bg-[#0D0D0D] p-3 rounded border border-[#333]">
                                            <span>{item.productSnapshot.name}</span>
                                            <span className="text-gray-400 whitespace-nowrap">
                                                {item.quantity} × ₹{Number(item.pricePerUnit || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 space-y-1 text-sm">
                                    <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>₹{Number(selectedOrder.subtotal ?? selectedOrder.total).toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between text-gray-400">
                                        <span>Delivery</span>
                                        <span>{selectedOrder.confirmationStatus === 'pending' ? 'Added on confirmation' : `₹${Number(selectedOrder.deliveryFee || 0).toLocaleString('en-IN')}`}</span>
                                    </div>
                                    {!!selectedOrder.discount && (
                                        <div className="flex justify-between text-gray-400"><span>Discount</span><span>−₹{Number(selectedOrder.discount).toLocaleString('en-IN')}</span></div>
                                    )}
                                    {!!selectedOrder.extraDiscount && (
                                        <div className="flex justify-between text-[#86efac]">
                                            <span>Extra discount{selectedOrder.extraDiscountPercent != null ? ` (${selectedOrder.extraDiscountPercent}%)` : ''}</span>
                                            <span>−₹{Number(selectedOrder.extraDiscount).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-semibold text-white"><span>Total</span><span>₹{Number(selectedOrder.total).toLocaleString('en-IN')}</span></div>
                                </div>
                            </div>

                            {/* Shipping Address */}
                            {selectedOrder.shippingAddress && (
                                <div className="p-4 bg-[#0D0D0D] rounded-lg border border-[#333]">
                                    <h3 className="font-medium mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" /> Shipping Address
                                    </h3>
                                    {(selectedOrder.shippingAddress.fullName || selectedOrder.shippingAddress.phone) && (
                                        <p className="text-sm text-white">
                                            {[selectedOrder.shippingAddress.fullName, selectedOrder.shippingAddress.phone].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-300">
                                        {[selectedOrder.shippingAddress.addressLine1 || selectedOrder.shippingAddress.address, selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state].filter(Boolean).join(', ')} - {selectedOrder.shippingAddress.pincode}
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

            {/* Load More Button */}
            {hasMore && orders.length > 0 && (
                <div className="flex justify-center pt-4">
                    <Button
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        variant="outline"
                        className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] min-w-[200px]"
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            `Load More (${orders.length}/${totalOrders})`
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}

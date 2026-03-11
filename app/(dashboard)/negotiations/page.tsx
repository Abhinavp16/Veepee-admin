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
import { Loader2, MessageSquare, Check, X, Send } from "lucide-react"
import { toast } from "sonner"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { apiFetch } from "@/lib/api"

interface NegotiationList {
    id: string
    negotiationNumber: string
    product: { name: string; price: number }
    wholesaler: { name: string }
    requestedQuantity: number
    requestedPricePerUnit: number
    status: string
}

interface NegotiationDetail {
    _id: string
    negotiationNumber: string
    productSnapshot: { name: string; sku: string; price: number }
    wholesalerId: { _id: string; name: string }
    requestedQuantity: number
    requestedPricePerUnit: number
    status: string
    message: string
    history: {
        action: string
        by: 'wholesaler' | 'admin'
        pricePerUnit: number
        message: string
        timestamp: string
    }[]
    createdAt: string
}

export default function NegotiationsPage() {
    const [negotiations, setNegotiations] = useState<NegotiationList[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedNegotiation, setSelectedNegotiation] = useState<NegotiationDetail | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    // Counter offer state
    const [counterPrice, setCounterPrice] = useState("")
    const [counterMessage, setCounterMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchNegotiations()
    }, [])

    async function fetchNegotiations() {
        try {
            const res = await apiFetch('/admin/negotiations')
            const data = await res.json()
            if (res.ok) {
                setNegotiations(data.data || [])
            } else {
                toast.error("Failed to fetch negotiations")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
        }
    }

    async function fetchNegotiationDetails(id: string) {
        try {
            const res = await apiFetch(`/admin/negotiations/${id}`)
            const data = await res.json()
            if (res.ok) {
                setSelectedNegotiation(data.data)
                setIsSheetOpen(true)
            }
        } catch (error) {
            toast.error("Failed to load details")
        }
    }

    async function handleAction(action: 'accept' | 'reject' | 'counter') {
        if (!selectedNegotiation) return
        setIsSubmitting(true)

        let endpoint = `/admin/negotiations/${selectedNegotiation._id}/${action}`
        let body = {}

        if (action === 'counter') {
            body = {
                pricePerUnit: Number(counterPrice),
                message: counterMessage
            }
        } else if (action === 'reject') {
            const reason = prompt("Enter rejection reason:")
            if (!reason) {
                setIsSubmitting(false)
                return
            }
            body = { reason }
        } else if (action === 'accept') {
            body = { message: "Accepted by admin" }
        }

        try {
            const res = await apiFetch(endpoint, {
                method: 'PUT',
                body: JSON.stringify(body)
            })

            if (res.ok) {
                toast.success(`Negotiation ${action}ed successfully`)
                setIsSheetOpen(false)
                fetchNegotiations()
                setCounterPrice("")
                setCounterMessage("")
            } else {
                toast.error("Action failed")
            }
        } catch (error) {
            toast.error("Error processing request")
        } finally {
            setIsSubmitting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>
            case 'accepted': return <Badge variant="outline" className="text-green-500 border-green-500">Accepted</Badge>
            case 'rejected': return <Badge variant="outline" className="text-red-500 border-red-500">Rejected</Badge>
            case 'countered': return <Badge variant="outline" className="text-blue-500 border-blue-500">Countered</Badge>
            default: return <Badge variant="outline" className="text-gray-500 border-gray-500">{status}</Badge>
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold text-white">Negotiations</h1>
            <Card className="bg-[#161616] border-[#333]">
                <CardHeader>
                    <CardTitle className="text-white">Active Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                        </div>
                    ) : negotiations.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No negotiations found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                    <TableHead className="text-gray-400">ID</TableHead>
                                    <TableHead className="text-gray-400">Wholesaler</TableHead>
                                    <TableHead className="text-gray-400">Product</TableHead>
                                    <TableHead className="text-gray-400 text-right">Qty</TableHead>
                                    <TableHead className="text-gray-400 text-right">Req. Price</TableHead>
                                    <TableHead className="text-gray-400 text-center">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {negotiations.map((negotiation) => (
                                    <TableRow key={negotiation.id} className="border-[#333] hover:bg-[#1A1A1A]">
                                        <TableCell className="text-white font-medium">{negotiation.negotiationNumber}</TableCell>
                                        <TableCell className="text-white">{negotiation.wholesaler?.name || 'Unknown'}</TableCell>
                                        <TableCell className="text-gray-400">{negotiation.product?.name || 'Unknown'}</TableCell>
                                        <TableCell className="text-white text-right">{negotiation.requestedQuantity}</TableCell>
                                        <TableCell className="text-white text-right">₹{negotiation.requestedPricePerUnit.toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(negotiation.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-white hover:bg-[#333]"
                                                onClick={() => fetchNegotiationDetails(negotiation.id)}
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="bg-[#161616] border-l-[#333] text-white w-[500px] sm:w-[600px] flex flex-col">
                    <SheetHeader>
                        <SheetTitle className="text-white">Negotiation Details</SheetTitle>
                        <SheetDescription className="text-gray-400">
                            {selectedNegotiation?.negotiationNumber} - {selectedNegotiation?.productSnapshot?.name}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedNegotiation && (
                        <div className="flex-1 flex flex-col gap-6 mt-6 overflow-hidden">
                            {/* Summary Card */}
                            <div className="bg-[#0D0D0D] p-4 rounded-lg border border-[#333] grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Original Price</span>
                                    <p className="text-lg font-mono">₹{selectedNegotiation.productSnapshot?.price}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Requested Qty</span>
                                    <p className="text-lg font-mono">{selectedNegotiation.requestedQuantity}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Requested Price</span>
                                    <p className="text-lg font-mono text-yellow-500">₹{selectedNegotiation.requestedPricePerUnit}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 uppercase">Total Value</span>
                                    <p className="text-lg font-mono">₹{(selectedNegotiation.requestedQuantity * selectedNegotiation.requestedPricePerUnit).toLocaleString()}</p>
                                </div>
                            </div>

                            <Separator className="bg-[#333]" />

                            {/* Chat History */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <h3 className="text-sm font-medium mb-2">History</h3>
                                <ScrollArea className="flex-1 pr-4">
                                    <div className="space-y-4">
                                        {selectedNegotiation.history.map((entry, idx) => (
                                            <div key={idx} className={`flex flex-col gap-1 ${entry.by === 'admin' ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-3 rounded-lg max-w-[80%] ${entry.by === 'admin' ? 'bg-[#86efac] text-black' : 'bg-[#333] text-white'}`}>
                                                    <div className="flex justify-between items-center gap-4 mb-1">
                                                        <span className="text-xs font-bold uppercase opacity-70">{entry.action}</span>
                                                        {entry.pricePerUnit && <span className="text-xs font-mono font-bold">₹{entry.pricePerUnit}</span>}
                                                    </div>
                                                    {entry.message && <p className="text-sm">{entry.message}</p>}
                                                </div>
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-[#333] mt-auto space-y-4">
                                {selectedNegotiation.status !== 'accepted' && selectedNegotiation.status !== 'rejected' && (
                                    <>
                                        <div className="bg-[#0D0D0D] p-3 rounded-lg border border-[#333] space-y-3">
                                            <Label className="text-xs uppercase text-gray-500">Counter Offer</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Price per unit"
                                                    className="bg-black border-[#333] h-9"
                                                    value={counterPrice}
                                                    onChange={(e) => setCounterPrice(e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Message (optional)"
                                                    className="bg-black border-[#333] h-9 flex-1"
                                                    value={counterMessage}
                                                    onChange={(e) => setCounterMessage(e.target.value)}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                    disabled={!counterPrice || isSubmitting}
                                                    onClick={() => handleAction('counter')}
                                                >
                                                    <Send className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                disabled={isSubmitting}
                                                onClick={() => handleAction('accept')}
                                            >
                                                <Check className="w-4 h-4 mr-2" /> Accept Deal
                                            </Button>
                                            <Button
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                                disabled={isSubmitting}
                                                onClick={() => handleAction('reject')}
                                            >
                                                <X className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}

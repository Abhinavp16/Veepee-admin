"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface OfferModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    offer?: any // If editing
    targetGroup: 'buyer' | 'wholesaler'
}

export function OfferModal({ isOpen, onClose, onSuccess, offer, targetGroup }: OfferModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        discountType: "percentage",
        discountValue: "",
        code: "",
        targetGroup: targetGroup,
        startDate: "",
        endDate: "",
        minPurchaseAmount: "0",
        maxDiscountAmount: "",
        isActive: true
    })

    useEffect(() => {
        if (offer) {
            setFormData({
                title: offer.title || "",
                description: offer.description || "",
                discountType: offer.discountType || "percentage",
                discountValue: offer.discountValue?.toString() || "",
                code: offer.code || "",
                targetGroup: offer.targetGroup || targetGroup,
                startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : "",
                endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : "",
                minPurchaseAmount: offer.minPurchaseAmount?.toString() || "0",
                maxDiscountAmount: offer.maxDiscountAmount?.toString() || "",
                isActive: offer.isActive !== false
            })
        } else {
            setFormData({
                title: "",
                description: "",
                discountType: "percentage",
                discountValue: "",
                code: "",
                targetGroup: targetGroup,
                startDate: new Date().toISOString().split('T')[0],
                endDate: "",
                minPurchaseAmount: "0",
                maxDiscountAmount: "",
                isActive: true
            })
        }
    }, [offer, targetGroup, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const endpoint = offer
                ? `/admin/offers/${offer._id}`
                : `/admin/offers`

            const method = offer ? 'PUT' : 'POST'

            const res = await apiFetch(endpoint, {
                method,
                body: JSON.stringify({
                    ...formData,
                    discountValue: Number(formData.discountValue),
                    minPurchaseAmount: Number(formData.minPurchaseAmount),
                    maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
                    code: formData.code || undefined
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(offer ? "Offer updated" : "Offer created")
                onSuccess()
                onClose()
            } else {
                toast.error(data.message || "Something went wrong")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to save offer")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#161616] border-[#333] text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{offer ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {offer ? 'Update the details of your promotional offer.' : 'Create a new promotional offer for your customers.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Buy 1 Get 1 or 20% Off"
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Promo Code (Optional)</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="SAVE20"
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter offer details..."
                            className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Discount Type</Label>
                            <Select
                                value={formData.discountType}
                                onValueChange={(val) => setFormData({ ...formData, discountType: val })}
                            >
                                <SelectTrigger className="bg-[#0D0D0D] border-[#333]">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#161616] border-[#333] text-white">
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discountValue">Discount Value</Label>
                            <Input
                                id="discountValue"
                                type="number"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                placeholder={formData.discountType === 'percentage' ? "20" : "500"}
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date (Optional)</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="minPurchase">Min Purchase Amount (₹)</Label>
                            <Input
                                id="minPurchase"
                                type="number"
                                value={formData.minPurchaseAmount}
                                onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxDiscount">Max Discount (₹ - Optional)</Label>
                            <Input
                                id="maxDiscount"
                                type="number"
                                value={formData.maxDiscountAmount}
                                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                                placeholder="No limit"
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-[#333]">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#86efac] text-black hover:bg-[#86efac]/90 px-8">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {offer ? 'Update Offer' : 'Create Offer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

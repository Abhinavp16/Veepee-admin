"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface AffiliateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    code?: any // If editing
}

export function AffiliateModal({ isOpen, onClose, onSuccess, code }: AffiliateModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        code: "",
        personName: "",
        discountType: "percentage",
        discountValue: "",
        usageLimit: "0",
        startDate: "",
        endDate: "",
        isActive: true
    })

    useEffect(() => {
        if (code) {
            setFormData({
                code: code.code || "",
                personName: code.personName || "",
                discountType: code.discountType || "percentage",
                discountValue: code.discountValue?.toString() || "",
                usageLimit: code.usageLimit?.toString() || "0",
                startDate: code.startDate ? new Date(code.startDate).toISOString().split('T')[0] : "",
                endDate: code.endDate ? new Date(code.endDate).toISOString().split('T')[0] : "",
                isActive: code.isActive !== false
            })
        } else {
            setFormData({
                code: "",
                personName: "",
                discountType: "percentage",
                discountValue: "",
                usageLimit: "0",
                startDate: new Date().toISOString().split('T')[0],
                endDate: "",
                isActive: true
            })
        }
    }, [code, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const endpoint = code
                ? `/admin/affiliate-codes/${code._id}`
                : `/admin/affiliate-codes`

            const method = code ? 'PUT' : 'POST'

            const res = await apiFetch(endpoint, {
                method,
                body: JSON.stringify({
                    ...formData,
                    discountValue: Number(formData.discountValue),
                    usageLimit: Number(formData.usageLimit),
                    endDate: formData.endDate || undefined
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(code ? "Affiliate code updated" : "Affiliate code created")
                onSuccess()
                onClose()
            } else {
                toast.error(data.message || "Something went wrong")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to save affiliate code")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#161616] border-[#333] text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{code ? 'Edit Affiliate Code' : 'Create Affiliate Code'}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        {code ? 'Update the details of the affiliate code.' : 'Create a new affiliate code for a specific person.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="personName">Person Name</Label>
                            <Input
                                id="personName"
                                value={formData.personName}
                                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                                placeholder="Enter name of person"
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Affiliate Code</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="E.g. JOHN20"
                                className="bg-[#0D0D0D] border-[#333] focus:border-[#86efac] transition-colors"
                                required
                            />
                        </div>
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
                            <Label htmlFor="usageLimit">Usage Limit (Total)</Label>
                            <Input
                                id="usageLimit"
                                type="number"
                                value={formData.usageLimit}
                                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                placeholder="Total number of uses allowed"
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

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-[#333]">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#86efac] text-black hover:bg-[#86efac]/90 px-8">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {code ? 'Update Affiliate Code' : 'Create Affiliate Code'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

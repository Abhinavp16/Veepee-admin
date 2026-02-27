"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Save, CreditCard, Building2, User, Upload, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { apiFetch, getUser } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const settingsSchema = z.object({
    businessName: z.string().optional(),
    businessEmail: z.string().optional(),
    businessPhone: z.string().optional(),
    upiId: z.string().optional(),
    upiDisplayName: z.string().optional(),
    minOrderAmount: z.coerce.number().optional(),
    defaultBulkMinQuantity: z.coerce.number().optional(),
    negotiationExpiryDays: z.coerce.number().optional(),
    lowStockThreshold: z.coerce.number().optional(),
    // Razorpay
    razorpayKeyId: z.string().optional(),
    razorpayKeySecret: z.string().optional(),
    razorpayEnabled: z.boolean().optional(),
    // Bank Transfer
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankIfscCode: z.string().optional(),
    bankAccountHolderName: z.string().optional(),
    bankTransferEnabled: z.boolean().optional(),
    avatar: z.string().optional(),
    features: z.record(z.any()).optional()
}).passthrough()

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            businessName: "",
            businessEmail: "",
            businessPhone: "",
            upiId: "",
            upiDisplayName: "",
            minOrderAmount: 0,
            defaultBulkMinQuantity: 10,
            negotiationExpiryDays: 7,
            lowStockThreshold: 10,
            razorpayKeyId: "",
            razorpayKeySecret: "",
            razorpayEnabled: false,
            bankName: "",
            bankAccountNumber: "",
            bankIfscCode: "",
            bankAccountHolderName: "",
            bankTransferEnabled: true,
            avatar: "",
            features: {}
        }
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        try {
            const res = await apiFetch('/admin/settings')
            const data = await res.json()
            if (res.ok && data.data) {
                form.reset(data.data)
            }
        } catch (error) {
            toast.error("Failed to load settings")
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(values: z.infer<typeof settingsSchema>) {
        console.log('Form submitted with values:', values)
        setIsSaving(true)
        try {
            const res = await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify(values)
            })

            if (res.ok) {
                toast.success("Settings updated successfully")
            } else {
                const err = await res.json()
                console.error('Save error:', err)
                toast.error(err.message || "Failed to update settings")
            }
        } catch (error) {
            console.error('Save exception:', error)
            toast.error("Error saving settings")
        } finally {
            setIsSaving(false)
        }
    }

    const [isUploading, setIsUploading] = useState(false)
    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('image', file)

        try {
            const token = localStorage.getItem('accessToken')
            const response = await fetch('http://192.168.1.10:5000/api/v1/upload/image?folder=avatars', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Upload failed')
            }

            const data = await response.json()
            if (data.success && data.data) {
                form.setValue('avatar', data.data.url)
                toast.success('Profile image uploaded. Save settings to apply.')

                // Also update local storage user object temporarily so header reflects change
                const user = getUser()
                if (user) {
                    user.avatar = data.data.url
                    localStorage.setItem('user', JSON.stringify(user))
                    window.dispatchEvent(new Event('storage'))
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image')
        } finally {
            setIsUploading(false)
            e.target.value = ''
        }
    }

    function onError(errors: any) {
        console.error('Form validation errors:', errors)
        const errorFields = Object.keys(errors).join(', ')
        toast.error(`Form errors in: ${errorFields}`)
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <h1 className="text-3xl font-bold text-white">Settings</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">

                    {/* General Settings */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <User className="h-5 w-5 text-[#86efac]" /> Profile Information
                            </CardTitle>
                            <CardDescription>Personal information and profile appearance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6 pb-4">
                                <Avatar className="h-24 w-24 border-2 border-[#333]">
                                    <AvatarImage src={form.watch('avatar')} />
                                    <AvatarFallback className="bg-gradient-to-br from-[#86efac]/20 to-[#86efac]/5 text-[#86efac] text-2xl font-bold">
                                        {getUser()?.name?.charAt(0).toUpperCase() || 'A'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-white">Profile Photo</p>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="bg-[#0D0D0D] border-[#333] text-white hover:bg-[#1A1A1A]"
                                            disabled={isUploading}
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                        >
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                            Upload Image
                                        </Button>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                        />
                                        {form.watch('avatar') && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => form.setValue('avatar', '')}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-[#919191]">Recommended: Square image, max 5MB</p>
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="businessName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-white">Business Name</FormLabel>
                                        <FormControl>
                                            <Input className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="businessEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Support Email</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="businessPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Support Phone</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Razorpay Settings */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <CreditCard className="h-5 w-5" /> Razorpay Payment Gateway
                            </CardTitle>
                            <CardDescription>Configure Razorpay for instant UPI/Card payments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="razorpayEnabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#333] p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base text-white">Enable Razorpay</FormLabel>
                                            <FormDescription>Allow customers to pay via Razorpay</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="razorpayKeyId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Razorpay Key ID</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="rzp_live_xxxxxxxxx" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="razorpayKeySecret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Razorpay Key Secret</FormLabel>
                                            <FormControl>
                                                <Input type="password" className="bg-[#0D0D0D] border-[#333] text-white" placeholder="••••••••••••" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bank Transfer Settings */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Building2 className="h-5 w-5" /> Bank Transfer Settings
                            </CardTitle>
                            <CardDescription>Bank details for manual transfer payments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="bankTransferEnabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#333] p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base text-white">Enable Bank Transfer</FormLabel>
                                            <FormDescription>Allow customers to pay via bank transfer + screenshot</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value !== false} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="bankName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Bank Name</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="e.g. HDFC Bank" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bankAccountHolderName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Account Holder Name</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="e.g. AgriMart Pvt Ltd" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bankAccountNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Account Number</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="e.g. 1234567890" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bankIfscCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">IFSC Code</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="e.g. HDFC0001234" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="border-t border-[#333] pt-4 mt-4">
                                <p className="text-sm text-[#919191] mb-3">UPI Details (for bank transfer option)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="upiId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">UPI ID</FormLabel>
                                                <FormControl>
                                                    <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="username@oksbi" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="upiDisplayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Display Name</FormLabel>
                                                <FormControl>
                                                    <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="AgriMart Business" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Operational Settings */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white">Operational Settings</CardTitle>
                            <CardDescription>Manage order limits and inventory thresholds</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="minOrderAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Min Order Amount (₹)</FormLabel>
                                            <FormControl>
                                                <Input type="number" className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="defaultBulkMinQuantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Default Bulk Min Qty</FormLabel>
                                            <FormControl>
                                                <Input type="number" className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="negotiationExpiryDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Negotiation Expiry (Days)</FormLabel>
                                            <FormControl>
                                                <Input type="number" className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lowStockThreshold"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Low Stock Threshold</FormLabel>
                                            <FormControl>
                                                <Input type="number" className="bg-[#0D0D0D] border-[#333] text-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Feature Flags */}
                    {/* <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white">Features</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="features.maintenanceMode"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#333] p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base text-white">Maintenance Mode</FormLabel>
                                            <FormDescription>Disable the store for customers</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card> */}

                    <Button type="submit" disabled={isSaving} className="w-full bg-green-500 hover:bg-green-600 text-white">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Save Settings
                    </Button>
                </form>
            </Form>
        </div>
    )
}

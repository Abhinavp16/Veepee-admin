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
import { Loader2, Save, Building2, User, Smartphone, Eye } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { HindiNamesTool } from "@/components/hindi-names-tool"
import { Switch } from "@/components/ui/switch"

const settingsSchema = z.object({
    businessName: z.string().optional(),
    businessEmail: z.string().optional(),
    businessPhone: z.string().optional(),
    businessAddress: z.string().optional(),
    gstin: z.string().optional(),
    upiId: z.string().optional(),
    upiDisplayName: z.string().optional(),
    minOrderAmount: z.coerce.number().optional(),
    defaultBulkMinQuantity: z.coerce.number().optional(),
    negotiationExpiryDays: z.coerce.number().optional(),
    lowStockThreshold: z.coerce.number().optional(),
    // [COMMENTED OUT RAZORPAY]
    // Bank Transfer
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankIfscCode: z.string().optional(),
    bankAccountHolderName: z.string().optional(),
    bankTransferEnabled: z.boolean().optional(),
    features: z.record(z.any()).optional(),
    mobileApp: z.record(z.any()).optional()
}).passthrough()

const APP_PLATFORMS = [
    { key: "android", label: "Android (Google Play)", urlHint: "https://play.google.com/store/apps/details?id=com.veepeeimpex.oxon" },
    { key: "ios", label: "iOS (App Store)", urlHint: "https://apps.apple.com/app/..." },
] as const

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            businessName: "",
            businessEmail: "",
            businessPhone: "",
            businessAddress: "",
            gstin: "",
            upiId: "",
            upiDisplayName: "",
            minOrderAmount: 0,
            defaultBulkMinQuantity: 10,
            negotiationExpiryDays: 7,
            lowStockThreshold: 10,
            // [COMMENTED OUT RAZORPAY]
            bankName: "",
            bankAccountNumber: "",
            bankIfscCode: "",
            bankAccountHolderName: "",
            bankTransferEnabled: true,
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
                form.reset({
                    ...data.data,
                    businessAddress: data.data.businessAddress ?? "",
                    gstin: data.data.gstin ?? "",
                })
            }
        } catch (error) {
            toast.error("Failed to load settings")
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(values: z.infer<typeof settingsSchema>) {
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
                                <User className="h-5 w-5 text-[#86efac]" /> Business details
                            </CardTitle>
                            <CardDescription>Shown on receipts and to customers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                                <FormField
                                    control={form.control}
                                    name="businessAddress"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">Business Address</FormLabel>
                                            <FormControl>
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="Shown on order receipts" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gstin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white">GSTIN</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="bg-[#0D0D0D] border-[#333] text-white uppercase"
                                                    placeholder="e.g. 22AAXFV7313A1Z8 (leave empty to hide)"
                                                    maxLength={15}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-gray-500">Printed on every order receipt.</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prices for visitors who aren't signed in */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Eye className="h-5 w-5 text-[#86efac]" /> Prices for visitors who aren't signed in
                            </CardTitle>
                            <CardDescription>The app and the website, for anyone not signed in</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="features.showCustomerPriceToGuests"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-[#333] p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base text-white">Show customer prices to guests</FormLabel>
                                            <FormDescription>
                                                Off: guests see only the MRP, and sign in to see their price. On: guests see customer prices, discounts and sale prices.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value === true} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <p className="text-xs text-gray-500">Signed-in customers and wholesalers always see their own prices. A change shows within a minute.</p>
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
                                                <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="e.g. Veepee Pvt Ltd" {...field} value={field.value || ''} />
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
                                                    <Input className="bg-[#0D0D0D] border-[#333] text-white" placeholder="Veepee Business" {...field} />
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


                    {/* Forced app update */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Smartphone className="h-5 w-5" /> App Update Requirement
                            </CardTitle>
                            <CardDescription>
                                When enabled, app builds older than the build number below are blocked until the
                                customer updates. Set the build number only after that build is live in the store.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {APP_PLATFORMS.map((platform) => (
                                <div key={platform.key} className="space-y-4 rounded-lg border border-[#333] p-4">
                                    <FormField
                                        control={form.control}
                                        name={`mobileApp.${platform.key}.enabled`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base text-white">{platform.label}</FormLabel>
                                                    <FormDescription>Require an update on this platform</FormDescription>
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
                                            name={`mobileApp.${platform.key}.latestVersion`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Latest version (shown to users)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="1.0.1" className="bg-[#0D0D0D] border-[#333] text-white" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`mobileApp.${platform.key}.latestBuildNumber`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Minimum build number</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} className="bg-[#0D0D0D] border-[#333] text-white" {...field} value={field.value ?? 0} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name={`mobileApp.${platform.key}.storeUrl`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Store link</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={platform.urlHint} className="bg-[#0D0D0D] border-[#333] text-white" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`mobileApp.${platform.key}.title`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Dialog title (optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Update required" className="bg-[#0D0D0D] border-[#333] text-white" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`mobileApp.${platform.key}.message`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Dialog message (optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Please update to continue." className="bg-[#0D0D0D] border-[#333] text-white" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <HindiNamesTool />

                    <Button type="submit" disabled={isSaving} className="w-full bg-[#86efac] hover:bg-[#86efac]/90 text-black">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Save Settings
                    </Button>
                </form>
            </Form>
        </div>
    )
}

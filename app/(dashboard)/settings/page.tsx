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
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

const settingsSchema = z.object({
    businessName: z.string().min(1, "Required"),
    businessEmail: z.string().email("Invalid email"),
    businessPhone: z.string().min(10, "Invalid phone"),
    upiId: z.string().min(1, "Required"),
    upiDisplayName: z.string().min(1, "Required"),
    minOrderAmount: z.coerce.number().min(0),
    defaultBulkMinQuantity: z.coerce.number().min(1),
    negotiationExpiryDays: z.coerce.number().min(1),
    lowStockThreshold: z.coerce.number().min(1),
    features: z.object({
        enableNegotiations: z.boolean(),
        enablePayments: z.boolean(),
        maintenanceMode: z.boolean()
    }).optional()
})

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
            features: {
                enableNegotiations: true,
                enablePayments: true,
                maintenanceMode: false
            }
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
                toast.error(err.message || "Failed to update settings")
            }
        } catch (error) {
            toast.error("Error saving settings")
        } finally {
            setIsSaving(false)
        }
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* General Settings */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white">General Information</CardTitle>
                            <CardDescription>Basic business details visible to customers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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

                    {/* Payment Settings */}
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <CardTitle className="text-white">Payment Settings</CardTitle>
                            <CardDescription>Configure UPI details for receiving payments</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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

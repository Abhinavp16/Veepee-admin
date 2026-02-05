"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash2, Building2, Flame, Star } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Company {
    _id: string
    name: string
    slug: string
}

const productSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    sku: z.string().min(1, "SKU is required"),
    mrp: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    retailPrice: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    wholesalePrice: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    stock: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    minWholesaleQuantity: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    status: z.enum(["active", "draft", "archived"]),
    imageUrl: z.string().url("Must be a valid URL"),
    isFeatured: z.boolean().default(false),
    isHot: z.boolean().default(false),
    company: z.string().optional(),
})

export default function AddProductPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [companies, setCompanies] = useState<Company[]>([])
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true)
    const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false)
    const [newCompanyName, setNewCompanyName] = useState("")
    const [isCreatingCompany, setIsCreatingCompany] = useState(false)

    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            description: "",
            category: "",
            sku: "",
            mrp: "",
            retailPrice: "",
            wholesalePrice: "",
            stock: "0",
            minWholesaleQuantity: "10",
            status: "draft",
            imageUrl: "",
            isFeatured: false,
            isHot: false,
            company: "",
        },
    })

    useEffect(() => {
        fetchCompanies()
    }, [])

    async function fetchCompanies() {
        try {
            const response = await fetch("http://localhost:5000/api/v1/companies")
            if (response.ok) {
                const data = await response.json()
                setCompanies(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch companies:", error)
        } finally {
            setIsLoadingCompanies(false)
        }
    }

    async function createNewCompany() {
        if (!newCompanyName.trim()) {
            toast.error("Company name is required")
            return
        }

        setIsCreatingCompany(true)
        try {
            const response = await fetch("http://localhost:5000/api/v1/companies", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ name: newCompanyName.trim() }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to create company")
            }

            const data = await response.json()
            const newCompany = data.data

            setCompanies(prev => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)))
            form.setValue("company", newCompany._id)
            setNewCompanyName("")
            setShowNewCompanyDialog(false)
            toast.success(`Company "${newCompany.name}" created successfully`)
        } catch (error: any) {
            toast.error(error.message || "Failed to create company")
        } finally {
            setIsCreatingCompany(false)
        }
    }

    async function onSubmit(values: z.infer<typeof productSchema>) {
        setIsLoading(true)
        try {
            // Construct payload matching backend expectation
            const payload = {
                name: values.name,
                description: values.description,
                category: values.category,
                sku: values.sku,
                status: values.status,
                mrp: Number(values.mrp),
                retailPrice: Number(values.retailPrice),
                wholesalePrice: Number(values.wholesalePrice),
                stock: Number(values.stock),
                minWholesaleQuantity: Number(values.minWholesaleQuantity),
                isFeatured: values.isFeatured,
                isHot: values.isHot,
                company: values.company && values.company !== 'none' ? values.company : null,
                // Simple image handling for now - assuming single image in array
                images: [{
                    url: values.imageUrl,
                    publicId: "temp-id-" + Date.now(), // Placeholder
                    isPrimary: true
                }],
                specifications: [] // Empty for now
            }

            const response = await fetch("http://localhost:5000/api/v1/admin/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error("Failed to create product")
            }

            toast.success("Product created successfully")
            router.push("/products")
        } catch (error) {
            console.error(error)
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-white">Add New Product</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Product Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter product name" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem className="mt-4">
                                                <FormLabel className="text-white">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Product description" {...field} className="bg-[#0D0D0D] border-[#333] text-white min-h-[100px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Category</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-[#0D0D0D] border-[#333] text-white">
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-[#0D0D0D] border-[#333]">
                                                            <SelectItem value="machinery">Machinery</SelectItem>
                                                            <SelectItem value="tools">Tools</SelectItem>
                                                            <SelectItem value="seeds">Seeds</SelectItem>
                                                            <SelectItem value="fertilizers">Fertilizers</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">SKU</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="PROD-001" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6">
                                    <FormField
                                        control={form.control}
                                        name="imageUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Image URL</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter a direct link to the product image
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-8">
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6 space-y-4">
                                    <h3 className="text-white font-medium mb-4">Pricing & Inventory</h3>

                                    <FormField
                                        control={form.control}
                                        name="mrp"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">MRP (₹)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="0.00" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="retailPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Retail Price (₹)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="0.00" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="wholesalePrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Wholesale Price (₹)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="0.00" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="stock"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Stock</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="0" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="minWholesaleQuantity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-white">Min Wholesale Qty</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="10" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white">Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-[#0D0D0D] border-[#333] text-white">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-[#0D0D0D] border-[#333]">
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="draft">Draft</SelectItem>
                                                        <SelectItem value="archived">Archived</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* Company & Product Flags */}
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6 space-y-4">
                                    <h3 className="text-white font-medium mb-4">Company & Visibility</h3>

                                    {/* Company Dropdown */}
                                    <FormField
                                        control={form.control}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    Company / Brand
                                                </FormLabel>
                                                <div className="flex gap-2">
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-[#0D0D0D] border-[#333] text-white flex-1">
                                                                <SelectValue placeholder={isLoadingCompanies ? "Loading..." : "Select company"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-[#0D0D0D] border-[#333]">
                                                            <SelectItem value="none">No Company</SelectItem>
                                                            {companies.map((company) => (
                                                                <SelectItem key={company._id} value={company._id}>
                                                                    {company.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
                                                        <DialogTrigger asChild>
                                                            <Button type="button" variant="outline" size="icon" className="border-[#333] text-white hover:bg-[#1A1A1A]">
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-[#161616] border-[#333]">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-white">Add New Company</DialogTitle>
                                                                <DialogDescription className="text-gray-400">
                                                                    Create a new company/brand to associate with products.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="py-4">
                                                                <Input
                                                                    placeholder="Company name (e.g., Mahindra, Tata)"
                                                                    value={newCompanyName}
                                                                    onChange={(e) => setNewCompanyName(e.target.value)}
                                                                    className="bg-[#0D0D0D] border-[#333] text-white"
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setShowNewCompanyDialog(false)}
                                                                    className="border-[#333] text-gray-400 hover:text-white"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    onClick={createNewCompany}
                                                                    disabled={isCreatingCompany}
                                                                    className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                                                                >
                                                                    {isCreatingCompany && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                    Create Company
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                                <FormDescription className="text-gray-500">
                                                    Select the manufacturer or brand
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Featured & Hot Product Toggles */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <FormField
                                            control={form.control}
                                            name="isFeatured"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between rounded-lg border border-[#333] p-3 bg-[#0D0D0D]">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-white flex items-center gap-2">
                                                            <Star className="h-4 w-4 text-yellow-500" />
                                                            Featured
                                                        </FormLabel>
                                                        <FormDescription className="text-xs text-gray-500">
                                                            Show on homepage
                                                        </FormDescription>
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
                                        <FormField
                                            control={form.control}
                                            name="isHot"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center justify-between rounded-lg border border-[#333] p-3 bg-[#0D0D0D]">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-white flex items-center gap-2">
                                                            <Flame className="h-4 w-4 text-orange-500" />
                                                            Hot Product
                                                        </FormLabel>
                                                        <FormDescription className="text-xs text-gray-500">
                                                            Mark as trending
                                                        </FormDescription>
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
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-[#333] text-gray hover:text-white hover:bg-[#1A1A1A]"
                                    onClick={() => router.back()}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="w-full bg-[#86efac] text-black hover:bg-[#86efac]/90" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Product
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    )
}

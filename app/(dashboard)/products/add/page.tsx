"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash2, Building2, Flame, Star, ImagePlus, X, GripVertical, Crown, Upload, Link, ArrowLeft, FolderPlus, Youtube, Truck } from "lucide-react"
import { useSearchParams } from "next/navigation"
import NextLink from "next/link"

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

interface Category {
    _id: string
    name: string
    slug: string
}

interface Company {
    _id: string
    name: string
    slug: string
}

type UploadStatus = 'idle' | 'converting' | 'uploading' | 'done'

interface ProductImage {
    url: string
    publicId: string
    isPrimary: boolean
    order: number
    originalSize?: number
    convertedSize?: number
    savings?: string
}

const productSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    shortDescription: z.string().optional(),
    bulletPoints: z.array(z.string()).optional(),
    category: z.string().min(1, "Category is required"),
    sku: z.string().min(1, "SKU is required"),
    mrp: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    retailPrice: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    wholesalePrice: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    stock: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    minWholesaleQuantity: z.string().refine((val) => !isNaN(Number(val)), "Must be a number"),
    status: z.enum(["active", "draft", "archived"]),
    isFeatured: z.boolean().default(false),
    isHot: z.boolean().default(false),
    company: z.string().optional(),
    videoUrl: z.string().optional(),
    shippingTerms: z.string().optional(),
})

export default function AddProductPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('edit')
    const isEditMode = !!editId
    
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingProduct, setIsLoadingProduct] = useState(false)
    const [companies, setCompanies] = useState<Company[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true)
    const [isLoadingCategories, setIsLoadingCategories] = useState(true)
    const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false)
    const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
    const [newCompanyName, setNewCompanyName] = useState("")
    const [newCompanyLogo, setNewCompanyLogo] = useState("")
    const [newCategoryName, setNewCategoryName] = useState("")
    const [isCreatingCompany, setIsCreatingCompany] = useState(false)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [images, setImages] = useState<ProductImage[]>([])
    const [newImageUrl, setNewImageUrl] = useState("")
    const [bulletPoints, setBulletPoints] = useState<string[]>([""])
    const [imageUploadMode, setImageUploadMode] = useState<'url' | 'file'>('url')
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')

    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            description: "",
            shortDescription: "",
            bulletPoints: [],
            category: "",
            sku: "",
            mrp: "",
            retailPrice: "",
            wholesalePrice: "",
            stock: "0",
            minWholesaleQuantity: "10",
            status: "draft",
            isFeatured: false,
            isHot: false,
            company: "",
            videoUrl: "",
            shippingTerms: "Free shipping on orders above ₹5,000. Standard delivery within 5-7 business days. Express delivery available at additional cost.\n\nReturn Policy: Products can be returned within 7 days of delivery if unused and in original packaging. Damaged or defective items will be replaced free of charge. Refunds are processed within 5-7 business days after the returned item is received and inspected.",
        },
    })

    useEffect(() => {
        fetchCompanies()
        fetchCategories()
        if (isEditMode && editId) {
            fetchProduct(editId)
        }
    }, [editId, isEditMode])

    async function fetchProduct(id: string) {
        setIsLoadingProduct(true)
        try {
            const token = localStorage.getItem('accessToken')
            const res = await fetch(`http://localhost:5000/api/v1/admin/products/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error("Product not found")
            
            const data = await res.json()
            const product = data.data
            
            if (!product) throw new Error("Product data is empty")
            
            // Set form values
            form.reset({
                name: product.name || "",
                description: product.description || "",
                shortDescription: product.shortDescription || "",
                bulletPoints: [],
                category: product.category || "",
                sku: product.sku || "",
                mrp: String(product.mrp || "0"),
                retailPrice: String(product.retailPrice || "0"),
                wholesalePrice: String(product.wholesalePrice || "0"),
                stock: String(product.stock || "0"),
                minWholesaleQuantity: String(product.minWholesaleQuantity || "10"),
                status: product.status || "draft",
                isFeatured: product.isFeatured || false,
                isHot: product.isHot || false,
                company: product.company?._id || product.company || "none",
                videoUrl: product.videoUrl || "",
                shippingTerms: product.shippingTerms || "",
            })
            
            // Set images
            if (product.images && product.images.length > 0) {
                setImages(product.images)
            }
            
            // Set bullet points from specifications
            if (product.specifications && product.specifications.length > 0) {
                setBulletPoints(product.specifications.map((s: any) => s.value))
            }
        } catch (error) {
            console.error("Fetch product error:", error)
            toast.error("Failed to load product")
            router.push("/products")
        } finally {
            setIsLoadingProduct(false)
        }
    }

    async function fetchCategories() {
        try {
            const response = await fetch("http://localhost:5000/api/v1/categories")
            if (response.ok) {
                const data = await response.json()
                setCategories(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error)
        } finally {
            setIsLoadingCategories(false)
        }
    }

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

    // Image management functions
    const addImage = () => {
        if (!newImageUrl.trim()) {
            toast.error("Please enter an image URL")
            return
        }
        const newImage: ProductImage = {
            url: newImageUrl.trim(),
            publicId: `img-${Date.now()}`,
            isPrimary: images.length === 0, // First image is primary by default
            order: images.length
        }
        setImages([...images, newImage])
        setNewImageUrl("")
        toast.success("Image added")
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploadingImage(true)
        setUploadStatus('converting')

        const formData = new FormData()
        
        // Upload multiple files
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i])
        }

        try {
            // Brief delay to show "converting" state
            await new Promise(r => setTimeout(r, 300))
            setUploadStatus('uploading')

            const token = localStorage.getItem('accessToken')
            const response = await fetch('http://localhost:5000/api/v1/upload/images?folder=products', {
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
            
            setUploadStatus('done')

            if (data.success && data.data) {
                const newImages: ProductImage[] = data.data.map((img: any, index: number) => ({
                    url: img.url,
                    publicId: img.publicId,
                    isPrimary: images.length === 0 && index === 0,
                    order: images.length + index,
                    originalSize: img.originalSize,
                    convertedSize: img.convertedSize,
                    savings: img.savings,
                }))
                setImages([...images, ...newImages])

                // Show savings info
                const totalOriginal = data.data.reduce((sum: number, img: any) => sum + (img.originalSize || 0), 0)
                const totalConverted = data.data.reduce((sum: number, img: any) => sum + (img.convertedSize || 0), 0)
                if (totalOriginal > 0) {
                    toast.success(
                        `${newImages.length} image(s) converted to WebP & uploaded! Saved ${formatBytes(totalOriginal - totalConverted)} (${Math.round((1 - totalConverted / totalOriginal) * 100)}% smaller)`
                    )
                } else {
                    toast.success(`${newImages.length} image(s) uploaded successfully`)
                }
            }

            // Keep "done" visible briefly
            await new Promise(r => setTimeout(r, 1000))
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Failed to upload images')
        } finally {
            setIsUploadingImage(false)
            setUploadStatus('idle')
            // Reset file input
            e.target.value = ''
        }
    }

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index)
        // If we removed the primary image, make the first one primary
        if (images[index].isPrimary && newImages.length > 0) {
            newImages[0].isPrimary = true
        }
        // Reorder
        newImages.forEach((img, i) => img.order = i)
        setImages(newImages)
    }

    const setFeaturedImage = (index: number) => {
        const newImages = images.map((img, i) => ({
            ...img,
            isPrimary: i === index
        }))
        setImages(newImages)
        toast.success("Featured image updated")
    }

    // Bullet points management
    const addBulletPoint = () => {
        setBulletPoints([...bulletPoints, ""])
    }

    const updateBulletPoint = (index: number, value: string) => {
        const newPoints = [...bulletPoints]
        newPoints[index] = value
        setBulletPoints(newPoints)
    }

    const removeBulletPoint = (index: number) => {
        if (bulletPoints.length === 1) return
        setBulletPoints(bulletPoints.filter((_, i) => i !== index))
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
                body: JSON.stringify({ 
                    name: newCompanyName.trim(),
                    logo: newCompanyLogo.trim() ? { url: newCompanyLogo.trim() } : undefined,
                }),
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
            setNewCompanyLogo("")
            setShowNewCompanyDialog(false)
            toast.success(`Company "${newCompany.name}" created successfully`)
        } catch (error: any) {
            toast.error(error.message || "Failed to create company")
        } finally {
            setIsCreatingCompany(false)
        }
    }

    async function createNewCategory() {
        if (!newCategoryName.trim()) {
            toast.error("Category name is required")
            return
        }

        setIsCreatingCategory(true)
        try {
            const response = await fetch("http://localhost:5000/api/v1/categories", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ name: newCategoryName.trim() }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to create category")
            }

            const data = await response.json()
            const newCategory = data.data

            setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
            form.setValue("category", newCategory.slug)
            setNewCategoryName("")
            setShowNewCategoryDialog(false)
            toast.success(`Category "${newCategory.name}" created successfully`)
        } catch (error: any) {
            toast.error(error.message || "Failed to create category")
        } finally {
            setIsCreatingCategory(false)
        }
    }

    async function onSubmit(values: z.infer<typeof productSchema>) {
        setIsLoading(true)
        try {
            // Validate images
            if (images.length === 0) {
                toast.error("Please add at least one product image")
                setIsLoading(false)
                return
            }

            // Filter out empty bullet points
            const validBulletPoints = bulletPoints.filter(bp => bp.trim() !== "")

            // Construct payload matching backend expectation
            const payload = {
                name: values.name,
                description: values.description,
                shortDescription: values.shortDescription || values.description.substring(0, 200),
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
                images: images,
                specifications: validBulletPoints.map((point, index) => ({
                    key: `feature_${index + 1}`,
                    value: point
                })),
                videoUrl: values.videoUrl?.trim() || null,
                shippingTerms: values.shippingTerms?.trim() || null,
            }

            const url = isEditMode 
                ? `http://localhost:5000/api/v1/admin/products/${editId}`
                : "http://localhost:5000/api/v1/admin/products"
            
            const response = await fetch(url, {
                method: isEditMode ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error(isEditMode ? "Failed to update product" : "Failed to create product")
            }

            toast.success(isEditMode ? "Product updated successfully" : "Product created successfully")
            router.push("/products")
        } catch (error) {
            console.error(error)
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoadingProduct) {
        return (
            <div className="flex justify-center items-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <NextLink href="/products">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </NextLink>
                <h1 className="text-3xl font-bold text-white">
                    {isEditMode ? "Edit Product" : "Add New Product"}
                </h1>
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
                                                    <div className="flex gap-2">
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-[#0D0D0D] border-[#333] text-white flex-1">
                                                                    <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-[#0D0D0D] border-[#333]">
                                                                {categories.map((category) => (
                                                                    <SelectItem key={category._id} value={category.slug}>
                                                                        {category.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
                                                            <DialogTrigger asChild>
                                                                <Button type="button" variant="outline" size="icon" className="border-[#333] bg-[#1A1A1A] text-white hover:bg-[#333]">
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-[#161616] border-[#333]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-white">Add New Category</DialogTitle>
                                                                    <DialogDescription className="text-gray-400">
                                                                        Create a new category for your products.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="py-4">
                                                                    <Input
                                                                        placeholder="Category name (e.g., Machinery, Seeds)"
                                                                        value={newCategoryName}
                                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                                        className="bg-[#0D0D0D] border-[#333] text-white"
                                                                    />
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => setShowNewCategoryDialog(false)}
                                                                        className="border-[#333] text-gray-400 hover:text-white"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        onClick={createNewCategory}
                                                                        disabled={isCreatingCategory}
                                                                        className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                                                                    >
                                                                        {isCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                        Create Category
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
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

                            {/* Product Images Card */}
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-medium flex items-center gap-2">
                                            <ImagePlus className="h-4 w-4" />
                                            Product Images
                                        </h3>
                                        {/* Toggle between URL and Upload */}
                                        <div className="flex bg-[#0D0D0D] rounded-lg p-1">
                                            <button
                                                type="button"
                                                onClick={() => setImageUploadMode('url')}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                                    imageUploadMode === 'url' 
                                                        ? 'bg-[#86efac] text-black' 
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <Link className="h-3 w-3" />
                                                URL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setImageUploadMode('file')}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                                    imageUploadMode === 'file' 
                                                        ? 'bg-[#86efac] text-black' 
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <Upload className="h-3 w-3" />
                                                Upload
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* URL Input Mode */}
                                    {imageUploadMode === 'url' && (
                                        <div className="flex gap-2 mb-4">
                                            <Input 
                                                placeholder="Enter image URL..." 
                                                value={newImageUrl}
                                                onChange={(e) => setNewImageUrl(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                                                className="bg-[#0D0D0D] border-[#333] text-white flex-1" 
                                            />
                                            <Button 
                                                type="button" 
                                                onClick={addImage}
                                                className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* File Upload Mode */}
                                    {imageUploadMode === 'file' && (
                                        <div className="mb-4">
                                            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg transition-colors ${
                                                isUploadingImage 
                                                    ? 'border-[#86efac]/50 bg-[#86efac]/5 cursor-wait' 
                                                    : 'border-[#333] bg-[#0D0D0D] hover:bg-[#1a1a1a] cursor-pointer'
                                            } ${isUploadingImage ? 'h-28' : 'h-24'}`}>
                                                <div className="flex flex-col items-center justify-center py-4">
                                                    {isUploadingImage ? (
                                                        <div className="flex flex-col items-center gap-2 w-full px-6">
                                                            {/* Step indicators */}
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                                                    uploadStatus === 'converting' 
                                                                        ? 'bg-yellow-500/20 text-yellow-400' 
                                                                        : uploadStatus === 'uploading' || uploadStatus === 'done'
                                                                            ? 'bg-green-500/20 text-green-400' 
                                                                            : 'bg-gray-500/20 text-gray-500'
                                                                }`}>
                                                                    {uploadStatus === 'converting' ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <span className="text-[10px]">✓</span>
                                                                    )}
                                                                    Converting to WebP
                                                                </span>
                                                                <span className="text-gray-600">→</span>
                                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                                                    uploadStatus === 'uploading' 
                                                                        ? 'bg-blue-500/20 text-blue-400' 
                                                                        : uploadStatus === 'done'
                                                                            ? 'bg-green-500/20 text-green-400' 
                                                                            : 'bg-gray-500/20 text-gray-500'
                                                                }`}>
                                                                    {uploadStatus === 'uploading' ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : uploadStatus === 'done' ? (
                                                                        <span className="text-[10px]">✓</span>
                                                                    ) : (
                                                                        <span className="text-[10px]">○</span>
                                                                    )}
                                                                    Uploading
                                                                </span>
                                                                <span className="text-gray-600">→</span>
                                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                                                    uploadStatus === 'done' 
                                                                        ? 'bg-green-500/20 text-green-400' 
                                                                        : 'bg-gray-500/20 text-gray-500'
                                                                }`}>
                                                                    {uploadStatus === 'done' ? (
                                                                        <span className="text-[10px]">✓</span>
                                                                    ) : (
                                                                        <span className="text-[10px]">○</span>
                                                                    )}
                                                                    Done
                                                                </span>
                                                            </div>
                                                            {/* Progress bar */}
                                                            <div className="w-full bg-[#333] rounded-full h-1.5">
                                                                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                                                                    uploadStatus === 'converting' 
                                                                        ? 'w-1/3 bg-yellow-500' 
                                                                        : uploadStatus === 'uploading' 
                                                                            ? 'w-2/3 bg-blue-500' 
                                                                            : 'w-full bg-green-500'
                                                                }`} />
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {uploadStatus === 'converting' && 'Converting images to WebP for smaller file sizes...'}
                                                                {uploadStatus === 'uploading' && 'Uploading optimized images to storage...'}
                                                                {uploadStatus === 'done' && 'Upload complete!'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-6 w-6 text-gray-400 mb-2" />
                                                            <p className="text-sm text-gray-400">
                                                                <span className="text-[#86efac]">Click to upload</span> or drag and drop
                                                            </p>
                                                            <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP (max 5MB) — auto-converted to WebP</p>
                                                        </>
                                                    )}
                                                </div>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                                    multiple
                                                    onChange={handleFileUpload}
                                                    disabled={isUploadingImage}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {/* Images Grid */}
                                    {images.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-3">
                                            {images.map((img, index) => (
                                                <div 
                                                    key={index} 
                                                    className={`relative group rounded-lg overflow-hidden border-2 ${
                                                        img.isPrimary ? 'border-[#86efac]' : 'border-[#333]'
                                                    }`}
                                                >
                                                    <img 
                                                        src={img.url} 
                                                        alt={`Product ${index + 1}`}
                                                        className="w-full aspect-square object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/1a1a1a/666?text=Error'
                                                        }}
                                                    />
                                                    {/* Featured Badge */}
                                                    {img.isPrimary && (
                                                        <div className="absolute top-1 left-1 bg-[#86efac] text-black text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <Crown className="h-3 w-3" />
                                                            Featured
                                                        </div>
                                                    )}
                                                    {/* WebP savings badge */}
                                                    {img.savings && (
                                                        <div className="absolute bottom-1 left-1 bg-blue-600/80 text-white text-[9px] px-1.5 py-0.5 rounded">
                                                            WebP {img.savings} saved
                                                        </div>
                                                    )}
                                                    {/* Actions Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        {!img.isPrimary && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setFeaturedImage(index)}
                                                                className="h-7 text-xs border-[#86efac] text-[#86efac] hover:bg-[#86efac]/20"
                                                            >
                                                                <Crown className="h-3 w-3 mr-1" />
                                                                Set Featured
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => removeImage(index)}
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-[#333] rounded-lg p-8 text-center">
                                            <ImagePlus className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                                            <p className="text-gray-500 text-sm">No images added yet</p>
                                            <p className="text-gray-600 text-xs mt-1">Add image URLs above</p>
                                        </div>
                                    )}
                                    <p className="text-gray-500 text-xs mt-2">
                                        First image will be featured by default. Click "Set Featured" to change.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Bullet Points / Features Card */}
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-medium">Key Features / Bullet Points</h3>
                                        <Button 
                                            type="button" 
                                            size="sm"
                                            variant="outline"
                                            onClick={addBulletPoint}
                                            className="border-[#333] text-gray-300 hover:text-white hover:bg-[#333]"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Point
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {bulletPoints.map((point, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <span className="text-[#86efac] text-sm">•</span>
                                                <Input
                                                    placeholder={`Feature ${index + 1}...`}
                                                    value={point}
                                                    onChange={(e) => updateBulletPoint(index, e.target.value)}
                                                    className="bg-[#0D0D0D] border-[#333] text-white flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => removeBulletPoint(index)}
                                                    disabled={bulletPoints.length === 1}
                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-400"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-gray-500 text-xs mt-3">
                                        Add key features that will be displayed as bullet points on the product page.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* YouTube Video URL */}
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6">
                                    <FormField
                                        control={form.control}
                                        name="videoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white flex items-center gap-2">
                                                    <Youtube className="h-4 w-4 text-red-500" />
                                                    Product Demo Video (YouTube)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                </FormControl>
                                                <FormDescription className="text-gray-500">
                                                    Paste a YouTube video link. Supports youtube.com/watch, youtu.be, and shorts URLs. This will be shown as a playable video on the product page.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* Shipping & Return Terms */}
                            <Card className="bg-[#161616] border-[#333]">
                                <CardContent className="pt-6">
                                    <FormField
                                        control={form.control}
                                        name="shippingTerms"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-white flex items-center gap-2">
                                                    <Truck className="h-4 w-4 text-blue-400" />
                                                    Shipping & Return Terms
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Enter shipping and return policy..." {...field} className="bg-[#0D0D0D] border-[#333] text-white min-h-[120px]" />
                                                </FormControl>
                                                <FormDescription className="text-gray-500">
                                                    Pre-filled with default terms. Edit to customize for this product. Displayed under &quot;Shipping &amp; Returns&quot; on the product page.
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
                                                <FormDescription className="text-gray-500">
                                                    Maximum Retail Price - shown as original price
                                                </FormDescription>
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
                                                    <FormLabel className="text-white">Customer Price (₹)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="0.00" {...field} className="bg-[#0D0D0D] border-[#333] text-white" />
                                                    </FormControl>
                                                    <FormDescription className="text-gray-500">
                                                        Price shown to regular customers
                                                    </FormDescription>
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
                                                    <FormDescription className="text-gray-500">
                                                        Price shown to wholesalers only
                                                    </FormDescription>
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
                                                            <Button type="button" variant="outline" size="icon" className="border-[#333] bg-[#1A1A1A] text-white hover:bg-[#333]">
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
                                                            <div className="space-y-4 py-4">
                                                                <div>
                                                                    <label className="text-sm font-medium text-white mb-2 block">Brand Name *</label>
                                                                    <Input
                                                                        placeholder="Company name (e.g., Mahindra, Tata)"
                                                                        value={newCompanyName}
                                                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                                                        className="bg-[#0D0D0D] border-[#333] text-white"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-white mb-2 block">Logo URL</label>
                                                                    <div className="flex gap-2">
                                                                        <Input
                                                                            placeholder="https://example.com/logo.png"
                                                                            value={newCompanyLogo}
                                                                            onChange={(e) => setNewCompanyLogo(e.target.value)}
                                                                            className="bg-[#0D0D0D] border-[#333] text-white flex-1"
                                                                        />
                                                                        {newCompanyLogo && (
                                                                            <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] border border-[#333] overflow-hidden shrink-0">
                                                                                <img 
                                                                                    src={newCompanyLogo} 
                                                                                    alt="Preview"
                                                                                    className="w-full h-full object-cover"
                                                                                    onError={(e) => {
                                                                                        (e.target as HTMLImageElement).style.display = 'none'
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-1">Optional: Enter a direct link to the brand logo</p>
                                                                </div>
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
                                    className="w-full border-[#333] bg-[#1A1A1A] text-gray-300 hover:text-white hover:bg-[#333]"
                                    onClick={() => router.back()}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="w-full bg-[#86efac] text-black hover:bg-[#86efac]/90" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditMode ? "Update Product" : "Create Product"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    )
}

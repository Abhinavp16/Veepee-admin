"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, FolderTree, Loader2, ImageIcon, LayoutGrid, List, Upload, Link, ToggleLeft, ToggleRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Category {
    _id: string
    name: string
    slug: string
    description?: string
    image?: { url?: string; publicId?: string }
    parent?: { _id: string; name: string; slug: string } | null
    order: number
    isActive: boolean
    productCount: number
    createdAt: string
}

type UploadStatus = 'idle' | 'converting' | 'uploading' | 'done'

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list')
    
    // Form state
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [imagePublicId, setImagePublicId] = useState("")
    const [parentId, setParentId] = useState<string>("none")
    const [order, setOrder] = useState("0")
    const [isActive, setIsActive] = useState(true)
    const [imageUploadMode, setImageUploadMode] = useState<'url' | 'file'>('url')
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')

    useEffect(() => {
        fetchCategories()
    }, [])

    async function fetchCategories() {
        try {
            const res = await fetch("http://localhost:5000/api/v1/categories")
            if (res.ok) {
                const data = await res.json()
                setCategories(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error)
            toast.error("Failed to load categories")
        } finally {
            setIsLoading(false)
        }
    }

    function openCreateDialog() {
        setEditingCategory(null)
        setName("")
        setDescription("")
        setImageUrl("")
        setImagePublicId("")
        setParentId("none")
        setOrder("0")
        setIsActive(true)
        setImageUploadMode('url')
        setIsDialogOpen(true)
    }

    function openEditDialog(category: Category) {
        setEditingCategory(category)
        setName(category.name)
        setDescription(category.description || "")
        setImageUrl(category.image?.url || "")
        setImagePublicId(category.image?.publicId || "")
        setParentId(category.parent?._id || "none")
        setOrder(String(category.order || 0))
        setIsActive(category.isActive)
        setImageUploadMode('url')
        setIsDialogOpen(true)
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingImage(true)
        setUploadStatus('converting')
        const formData = new FormData()
        formData.append('image', file)

        try {
            await new Promise(r => setTimeout(r, 300))
            setUploadStatus('uploading')

            const token = localStorage.getItem('accessToken')
            const response = await fetch('http://localhost:5000/api/v1/upload/image?folder=categories', {
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
                setImageUrl(data.data.url)
                setImagePublicId(data.data.publicId)
                const orig = data.data.originalSize || 0
                const conv = data.data.convertedSize || 0
                if (orig > 0 && conv > 0) {
                    toast.success(`Image converted to WebP & uploaded! Saved ${formatBytes(orig - conv)} (${data.data.savings} smaller)`)
                } else {
                    toast.success('Image uploaded successfully')
                }
            }

            await new Promise(r => setTimeout(r, 1000))
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Failed to upload image')
        } finally {
            setIsUploadingImage(false)
            setUploadStatus('idle')
            e.target.value = ''
        }
    }

    async function handleSubmit() {
        if (!name.trim()) {
            toast.error("Category name is required")
            return
        }

        setIsSubmitting(true)
        const token = localStorage.getItem('accessToken')

        try {
            const payload: any = {
                name: name.trim(),
                description: description.trim() || undefined,
                image: imageUrl.trim() ? { url: imageUrl.trim(), publicId: imagePublicId || undefined } : undefined,
                parent: parentId !== "none" ? parentId : null,
                order: Number(order) || 0,
                isActive,
            }

            const url = editingCategory
                ? `http://localhost:5000/api/v1/categories/${editingCategory._id}`
                : "http://localhost:5000/api/v1/categories"

            const res = await fetch(url, {
                method: editingCategory ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Failed to save category")
            }

            toast.success(editingCategory ? "Category updated successfully" : "Category created successfully")
            setIsDialogOpen(false)
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message || "Failed to save category")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        const token = localStorage.getItem('accessToken')

        try {
            const res = await fetch(`http://localhost:5000/api/v1/categories/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Failed to delete category")
            }

            toast.success("Category deleted successfully")
            setDeleteConfirmId(null)
            fetchCategories()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete category")
        }
    }

    // Get parent categories for the dropdown (exclude the category being edited)
    const parentOptions = categories.filter(c => 
        !editingCategory || c._id !== editingCategory._id
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FolderTree className="h-8 w-8 text-[#86efac]" />
                    <h1 className="text-3xl font-bold text-white">Categories</h1>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[#161616] rounded-lg p-1 border border-[#333]">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#86efac] text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-[#86efac] text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                    <Button 
                        onClick={openCreateDialog}
                        className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                    </Button>
                </div>
            </div>

            {/* Categories Content */}
            {isLoading ? (
                <div className="bg-[#161616] rounded-xl border border-[#333] flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                </div>
            ) : categories.length === 0 ? (
                <div className="bg-[#161616] rounded-xl border border-[#333] flex flex-col items-center justify-center h-48 text-gray-400">
                    <FolderTree className="h-12 w-12 mb-4 opacity-50" />
                    <p>No categories found</p>
                    <p className="text-sm">Create your first category to get started</p>
                </div>
            ) : viewMode === 'list' ? (
                /* List View */
                <div className="bg-[#161616] rounded-xl border border-[#333] overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#333] hover:bg-transparent">
                                <TableHead className="text-gray-400">Image</TableHead>
                                <TableHead className="text-gray-400">Name</TableHead>
                                <TableHead className="text-gray-400">Slug</TableHead>
                                <TableHead className="text-gray-400">Parent</TableHead>
                                <TableHead className="text-gray-400">Products</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category._id} className="border-[#333]">
                                    <TableCell>
                                        {category.image?.url ? (
                                            <img 
                                                src={category.image.url} 
                                                alt={category.name}
                                                className="w-10 h-10 rounded-lg object-cover bg-[#0D0D0D]"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] flex items-center justify-center">
                                                <FolderTree className="h-5 w-5 text-gray-500" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {category.name}
                                    </TableCell>
                                    <TableCell className="text-gray-400">
                                        {category.slug}
                                    </TableCell>
                                    <TableCell className="text-gray-400">
                                        {category.parent?.name || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <Package className="h-3 w-3" />
                                            {category.productCount}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            category.isActive 
                                                ? 'bg-green-500/20 text-green-400' 
                                                : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                            {category.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                onClick={() => openEditDialog(category)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => setDeleteConfirmId(category._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                /* Card View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.map((category) => (
                        <div 
                            key={category._id} 
                            className={`bg-[#161616] rounded-xl border p-4 hover:border-[#444] transition-colors ${
                                category.isActive ? 'border-[#333]' : 'border-[#333] opacity-60'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                {category.image?.url ? (
                                    <img 
                                        src={category.image.url} 
                                        alt={category.name}
                                        className="w-14 h-14 rounded-xl object-cover bg-[#0D0D0D]"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-[#0D0D0D] flex items-center justify-center">
                                        <FolderTree className="h-7 w-7 text-gray-500" />
                                    </div>
                                )}
                                <div className="flex gap-1">
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                        onClick={() => openEditDialog(category)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                        onClick={() => setDeleteConfirmId(category._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-white text-lg mb-1">{category.name}</h3>
                            <p className="text-gray-500 text-sm mb-2">/{category.slug}</p>
                            <div className="flex items-center gap-3 text-xs">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                                    category.isActive 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                    {category.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="flex items-center gap-1 text-gray-400">
                                    <Package className="h-3 w-3" />
                                    {category.productCount} products
                                </span>
                            </div>
                            {category.parent?.name && (
                                <p className="text-gray-500 text-xs mt-2">Parent: {category.parent.name}</p>
                            )}
                            {category.description && (
                                <p className="text-gray-400 text-sm mt-2 line-clamp-2">{category.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#161616] border-[#333] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingCategory ? "Edit Category" : "Add New Category"}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {editingCategory 
                                ? "Update the category information below."
                                : "Create a new category to organize your products."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                        <div>
                            <label className="text-sm font-medium text-white mb-2 block">
                                Category Name *
                            </label>
                            <Input
                                placeholder="e.g., Machinery, Seeds, Fertilizers"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-[#0D0D0D] border-[#333] text-white"
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-white">
                                    Category Image
                                </label>
                                <div className="flex bg-[#0D0D0D] rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setImageUploadMode('url')}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
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
                                        className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
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
                            
                            {imageUploadMode === 'url' ? (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://example.com/image.png"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="bg-[#0D0D0D] border-[#333] text-white flex-1"
                                    />
                                    {imageUrl && (
                                        <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] border border-[#333] overflow-hidden shrink-0">
                                            <img 
                                                src={imageUrl} 
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-3 items-center">
                                    <label className={`flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-lg transition-colors ${
                                        isUploadingImage 
                                            ? 'border-[#86efac]/50 bg-[#86efac]/5 cursor-wait h-24' 
                                            : 'border-[#333] bg-[#0D0D0D] hover:bg-[#1a1a1a] cursor-pointer h-20'
                                    }`}>
                                        <div className="flex flex-col items-center justify-center py-3">
                                            {isUploadingImage ? (
                                                <div className="flex flex-col items-center gap-1.5 w-full px-4">
                                                    <div className="flex items-center gap-1 text-[10px]">
                                                        <span className={`px-1.5 py-0.5 rounded-full ${
                                                            uploadStatus === 'converting' 
                                                                ? 'bg-yellow-500/20 text-yellow-400' 
                                                                : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                            {uploadStatus === 'converting' ? '⟳ Converting' : '✓ Converted'}
                                                        </span>
                                                        <span className="text-gray-600">→</span>
                                                        <span className={`px-1.5 py-0.5 rounded-full ${
                                                            uploadStatus === 'uploading' 
                                                                ? 'bg-blue-500/20 text-blue-400' 
                                                                : uploadStatus === 'done' 
                                                                    ? 'bg-green-500/20 text-green-400' 
                                                                    : 'bg-gray-500/20 text-gray-500'
                                                        }`}>
                                                            {uploadStatus === 'uploading' ? '⟳ Uploading' : uploadStatus === 'done' ? '✓ Done' : '○ Upload'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-[#333] rounded-full h-1">
                                                        <div className={`h-1 rounded-full transition-all duration-500 ${
                                                            uploadStatus === 'converting' ? 'w-1/3 bg-yellow-500' 
                                                            : uploadStatus === 'uploading' ? 'w-2/3 bg-blue-500' 
                                                            : 'w-full bg-green-500'
                                                        }`} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="h-5 w-5 text-gray-400 mb-1" />
                                                    <p className="text-xs text-gray-400">
                                                        <span className="text-[#86efac]">Click to upload</span> — auto WebP
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleImageUpload}
                                            disabled={isUploadingImage}
                                        />
                                    </label>
                                    {imageUrl && (
                                        <div className="w-20 h-20 rounded-lg bg-[#0D0D0D] border border-[#333] overflow-hidden shrink-0">
                                            <img 
                                                src={imageUrl} 
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                {imageUploadMode === 'url' ? 'Enter a direct link to the category image' : 'PNG, JPG, GIF, WebP (max 5MB) — auto-converted to WebP'}
                            </p>
                        </div>

                        {/* Parent Category */}
                        <div>
                            <label className="text-sm font-medium text-white mb-2 block">
                                Parent Category
                            </label>
                            <Select value={parentId} onValueChange={setParentId}>
                                <SelectTrigger className="bg-[#0D0D0D] border-[#333] text-white">
                                    <SelectValue placeholder="Select parent category" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0D0D0D] border-[#333]">
                                    <SelectItem value="none">None (Root Category)</SelectItem>
                                    {parentOptions.map((cat) => (
                                        <SelectItem key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                Leave as &quot;None&quot; for a top-level category
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm font-medium text-white mb-2 block">
                                Description
                            </label>
                            <Textarea
                                placeholder="Brief description of the category..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-[#0D0D0D] border-[#333] text-white min-h-[80px]"
                            />
                        </div>

                        {/* Order & Active */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-white mb-2 block">
                                    Display Order
                                </label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={order}
                                    onChange={(e) => setOrder(e.target.value)}
                                    className="bg-[#0D0D0D] border-[#333] text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-sm font-medium text-white mb-2 block">
                                    Active
                                </label>
                                <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-[#333] bg-[#0D0D0D]">
                                    <Switch
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                    <span className={`text-sm ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-[#333] bg-[#1A1A1A] text-gray-300 hover:text-white hover:bg-[#333]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingCategory ? "Update Category" : "Create Category"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="bg-[#161616] border-[#333]">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Category</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Are you sure you want to delete this category? This action cannot be undone.
                            Categories with subcategories or products cannot be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmId(null)}
                            className="border-[#333] bg-[#1A1A1A] text-gray-300 hover:text-white hover:bg-[#333]"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

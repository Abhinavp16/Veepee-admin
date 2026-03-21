"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Building2, Loader2, ImageIcon, LayoutGrid, List, Upload, Link, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

interface Company {
    _id: string
    name: string
    slug: string
    logo?: { url?: string; publicId?: string }
    description?: string
    createdAt: string
}

export default function BrandsPage() {
    const [companies, setCompanies] = useState<Company[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingCompany, setEditingCompany] = useState<Company | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'card'>('card')

    // Search & Pagination state
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalBrands, setTotalBrands] = useState(0)
    const [hasMore, setHasMore] = useState(false)

    // Form state
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [logoUrl, setLogoUrl] = useState("")
    const [logoPublicId, setLogoPublicId] = useState("")
    const [logoUploadMode, setLogoUploadMode] = useState<'url' | 'file'>('url')
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)

    useEffect(() => {
        fetchCompanies(1, true)
    }, [])

    async function fetchCompanies(pageNum: number = 1, reset: boolean = false) {
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

            const res = await apiFetch(`/companies?${params.toString()}`, { skipAuth: true })
            if (res.ok) {
                const data = await res.json()
                const items = data.data || []
                const pagination = data.pagination || {}

                if (reset || pageNum === 1) {
                    setCompanies(items)
                } else {
                    setCompanies(prev => [...prev, ...items])
                }

                setTotalPages(pagination.totalPages || 1)
                setTotalBrands(pagination.total || items.length)
                setHasMore((pagination.page || 1) < (pagination.totalPages || 1))
            }
        } catch (error) {
            console.error("Failed to fetch companies:", error)
            toast.error("Failed to load brands")
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        fetchCompanies(1, true)
    }, [searchQuery])

    const loadMore = useCallback(() => {
        if (hasMore && !isLoadingMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchCompanies(nextPage, false)
        }
    }, [hasMore, isLoadingMore, page])

    function openCreateDialog() {
        setEditingCompany(null)
        setName("")
        setDescription("")
        setLogoUrl("")
        setLogoPublicId("")
        setLogoUploadMode('url')
        setIsDialogOpen(true)
    }

    function openEditDialog(company: Company) {
        setEditingCompany(company)
        setName(company.name)
        setDescription(company.description || "")
        setLogoUrl(company.logo?.url || "")
        setLogoPublicId(company.logo?.publicId || "")
        setLogoUploadMode('url')
        setIsDialogOpen(true)
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingLogo(true)
        const formData = new FormData()
        formData.append('image', file)

        try {
            const response = await apiFetch('/upload/image?folder=brands', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Upload failed')
            }

            const data = await response.json()
            
            if (data.success && data.data) {
                setLogoUrl(data.data.url)
                setLogoPublicId(data.data.publicId)
                toast.success('Logo uploaded successfully')
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Failed to upload logo')
        } finally {
            setIsUploadingLogo(false)
            e.target.value = ''
        }
    }

    async function handleSubmit() {
        if (!name.trim()) {
            toast.error("Brand name is required")
            return
        }

        setIsSubmitting(true)

        try {
            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                logo: logoUrl.trim() ? { url: logoUrl.trim(), publicId: logoPublicId || undefined } : undefined,
            }

            const endpoint = editingCompany
                ? `/companies/${editingCompany._id}`
                : "/companies"

            const res = await apiFetch(endpoint, {
                method: editingCompany ? "PUT" : "POST",
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Failed to save brand")
            }

            toast.success(editingCompany ? "Brand updated successfully" : "Brand created successfully")
            setIsDialogOpen(false)
            fetchCompanies()
        } catch (error: any) {
            toast.error(error.message || "Failed to save brand")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            const res = await apiFetch(`/companies/${id}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Failed to delete brand")
            }

            toast.success("Brand deleted successfully")
            setDeleteConfirmId(null)
            fetchCompanies()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete brand")
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-[#86efac]" />
                    <div>
                        <h1 className="text-3xl font-bold text-white">Brands</h1>
                        <p className="text-gray-400 text-sm">{totalBrands > 0 && `(${totalBrands} brands)`}</p>
                    </div>
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
                        Add Brand
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search brands by name..."
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
                            fetchCompanies(1, true)
                        }}
                        className="text-gray-400 hover:text-white"
                    >
                        Clear
                    </Button>
                )}
            </form>

            {/* Brands Content */}
            {isLoading ? (
                <div className="bg-[#161616] rounded-xl border border-[#333] flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                </div>
            ) : companies.length === 0 ? (
                <div className="bg-[#161616] rounded-xl border border-[#333] flex flex-col items-center justify-center h-48 text-gray-400">
                    <Building2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>No brands found</p>
                    <p className="text-sm">Create your first brand to get started</p>
                </div>
            ) : viewMode === 'list' ? (
                /* List View */
                <div className="bg-[#161616] rounded-xl border border-[#333] overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#333] hover:bg-transparent">
                                <TableHead className="text-gray-400">Logo</TableHead>
                                <TableHead className="text-gray-400">Name</TableHead>
                                <TableHead className="text-gray-400">Slug</TableHead>
                                <TableHead className="text-gray-400">Description</TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companies.map((company) => (
                                <TableRow key={company._id} className="border-[#333]">
                                    <TableCell>
                                        {company.logo?.url ? (
                                            <img 
                                                src={company.logo.url} 
                                                alt={company.name}
                                                className="w-10 h-10 rounded-lg object-cover bg-[#0D0D0D]"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-gray-500" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {company.name}
                                    </TableCell>
                                    <TableCell className="text-gray-400">
                                        {company.slug}
                                    </TableCell>
                                    <TableCell className="text-gray-400 max-w-[200px] truncate">
                                        {company.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                onClick={() => openEditDialog(company)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => setDeleteConfirmId(company._id)}
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
                    {companies.map((company) => (
                        <div 
                            key={company._id} 
                            className="bg-[#161616] rounded-xl border border-[#333] p-4 hover:border-[#444] transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                {company.logo?.url ? (
                                    <img 
                                        src={company.logo.url} 
                                        alt={company.name}
                                        className="w-16 h-16 rounded-xl object-cover bg-[#0D0D0D]"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-[#0D0D0D] flex items-center justify-center">
                                        <Building2 className="h-8 w-8 text-gray-500" />
                                    </div>
                                )}
                                <div className="flex gap-1">
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                        onClick={() => openEditDialog(company)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                        onClick={() => setDeleteConfirmId(company._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-white text-lg mb-1">{company.name}</h3>
                            <p className="text-gray-500 text-sm mb-2">/{company.slug}</p>
                            {company.description && (
                                <p className="text-gray-400 text-sm line-clamp-2">{company.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#161616] border-[#333]">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingCompany ? "Edit Brand" : "Add New Brand"}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {editingCompany 
                                ? "Update the brand information below."
                                : "Create a new brand/company to associate with products."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-white mb-2 block">
                                Brand Name *
                            </label>
                            <Input
                                placeholder="e.g., John Deere, Mahindra"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-[#0D0D0D] border-[#333] text-white"
                            />
                        </div>
                        
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-white">
                                    Brand Logo
                                </label>
                                <div className="flex bg-[#0D0D0D] rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setLogoUploadMode('url')}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                            logoUploadMode === 'url' 
                                                ? 'bg-[#86efac] text-black' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Link className="h-3 w-3" />
                                        URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLogoUploadMode('file')}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                                            logoUploadMode === 'file' 
                                                ? 'bg-[#86efac] text-black' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Upload className="h-3 w-3" />
                                        Upload
                                    </button>
                                </div>
                            </div>
                            
                            {logoUploadMode === 'url' ? (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://example.com/logo.png"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        className="bg-[#0D0D0D] border-[#333] text-white flex-1"
                                    />
                                    {logoUrl && (
                                        <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] border border-[#333] overflow-hidden shrink-0">
                                            <img 
                                                src={logoUrl} 
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
                                    <label className="flex flex-col items-center justify-center flex-1 h-20 border-2 border-dashed border-[#333] rounded-lg cursor-pointer bg-[#0D0D0D] hover:bg-[#1a1a1a] transition-colors">
                                        <div className="flex flex-col items-center justify-center">
                                            {isUploadingLogo ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 text-[#86efac] animate-spin mb-1" />
                                                    <p className="text-xs text-gray-400">Uploading...</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-5 w-5 text-gray-400 mb-1" />
                                                    <p className="text-xs text-gray-400">
                                                        <span className="text-[#86efac]">Click to upload</span>
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleLogoUpload}
                                            disabled={isUploadingLogo}
                                        />
                                    </label>
                                    {logoUrl && (
                                        <div className="w-20 h-20 rounded-lg bg-[#0D0D0D] border border-[#333] overflow-hidden shrink-0">
                                            <img 
                                                src={logoUrl} 
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                {logoUploadMode === 'url' ? 'Enter a direct link to the brand logo' : 'PNG, JPG, GIF, WebP (max 5MB)'}
                            </p>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-white mb-2 block">
                                Description
                            </label>
                            <Textarea
                                placeholder="Brief description of the brand..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-[#0D0D0D] border-[#333] text-white min-h-[80px]"
                            />
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
                            {editingCompany ? "Update Brand" : "Create Brand"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="bg-[#161616] border-[#333]">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Brand</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Are you sure you want to delete this brand? This action cannot be undone.
                            Products associated with this brand will no longer have a brand assigned.
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
                            Delete Brand
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Load More Button */}
            {hasMore && companies.length > 0 && (
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
                            `Load More (${companies.length}/${totalBrands})`
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}

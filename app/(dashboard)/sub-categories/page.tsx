"use client"

import { useEffect, useMemo, useState } from "react"
import NextLink from "next/link"
import { useSearchParams } from "next/navigation"
import { FolderTree, Layers, Loader2, Package, Pencil, Plus, Search, Trash2, Upload, X, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/table-skeleton"
import { useDashboardUser } from "@/components/dashboard-context"
import { apiFetch } from "@/lib/api"
import { fetchAllCategories, getCategoryParentId, type CategoryOption } from "@/lib/categories"

interface Link {
    categoryId: string
    name: string
    slug: string
    isActive: boolean
    order: number
    productCount: number
}

interface SubCategory {
    _id: string
    name: string
    slug: string
    description?: string
    image?: { url?: string | null; publicId?: string | null }
    isActive: boolean
    categories: Link[]
    productCount: number
}

interface PlacedProduct {
    _id: string
    name: string
    sku?: string
    status?: string
    brand?: string
    image?: string | null
    /** Also shown in the category's own list, not only under this sub-category. */
    alsoInCategory?: boolean
}

async function readError(response: Response, fallback: string) {
    const payload = await response.json().catch(() => null)
    return payload?.message || fallback
}

export default function SubCategoriesPage() {
    const isAdmin = useDashboardUser()?.role === "admin"
    const searchParams = useSearchParams()
    const [subs, setSubs] = useState<SubCategory[]>([])
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get("categoryId") || "all")

    // Create / edit
    const [editing, setEditing] = useState<SubCategory | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [imagePublicId, setImagePublicId] = useState("")
    const [isActive, setIsActive] = useState(true)
    const [linkedIds, setLinkedIds] = useState<string[]>([])
    const [categorySearch, setCategorySearch] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Delete
    const [deleting, setDeleting] = useState<SubCategory | null>(null)

    // Products of "Category › Sub-category"
    const [productsFor, setProductsFor] = useState<SubCategory | null>(null)
    const [productsCategory, setProductsCategory] = useState("")
    const [placed, setPlaced] = useState<PlacedProduct[]>([])
    const [isLoadingPlaced, setIsLoadingPlaced] = useState(false)
    const [productSearch, setProductSearch] = useState("")
    const [searchResults, setSearchResults] = useState<PlacedProduct[]>([])
    // New products: shown only under the sub-category unless this is on.
    const [addAlsoInCategory, setAddAlsoInCategory] = useState(false)
    const [isSearching, setIsSearching] = useState(false)

    const topCategories = useMemo(
        () => categories.filter((category) => getCategoryParentId(category) === null)
            .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)),
        [categories],
    )

    async function load() {
        setIsLoading(true)
        try {
            const query = categoryFilter !== "all" ? `?category=${encodeURIComponent(categoryFilter)}` : ""
            const [subsResponse, allCategories] = await Promise.all([
                apiFetch(`/sub-categories/admin${query}`),
                categories.length > 0 ? Promise.resolve(categories) : fetchAllCategories(),
            ])
            if (!subsResponse.ok) throw new Error(await readError(subsResponse, "Failed to load sub-categories"))
            const payload = await subsResponse.json()
            setSubs(Array.isArray(payload.data) ? payload.data : [])
            setCategories(allCategories)
        } catch (error: any) {
            toast.error(error.message || "Failed to load sub-categories")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryFilter])

    const visible = subs.filter((sub) => !search.trim() || sub.name.toLowerCase().includes(search.trim().toLowerCase()))

    function openCreate() {
        setEditing(null)
        setName("")
        setDescription("")
        setImageUrl("")
        setImagePublicId("")
        setIsActive(true)
        setLinkedIds(categoryFilter !== "all" ? [categoryFilter] : [])
        setCategorySearch("")
        setIsFormOpen(true)
    }

    function openEdit(sub: SubCategory) {
        setEditing(sub)
        setName(sub.name)
        setDescription(sub.description || "")
        setImageUrl(sub.image?.url || "")
        setImagePublicId(sub.image?.publicId || "")
        setIsActive(sub.isActive)
        setLinkedIds(sub.categories.map((link) => link.categoryId))
        setCategorySearch("")
        setIsFormOpen(true)
    }

    async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        setIsUploading(true)
        try {
            const form = new FormData()
            form.append("image", file)
            const response = await apiFetch("/upload/image?folder=categories", { method: "POST", body: form })
            if (!response.ok) throw new Error(await readError(response, "Upload failed"))
            const data = await response.json()
            setImageUrl(data.data?.url || "")
            setImagePublicId(data.data?.publicId || "")
            toast.success("Image uploaded")
        } catch (error: any) {
            toast.error(error.message || "Upload failed")
        } finally {
            setIsUploading(false)
            event.target.value = ""
        }
    }

    async function save() {
        if (!name.trim()) return toast.error("Enter a name")
        if (linkedIds.length === 0) return toast.error("Choose at least one category to show it in")
        setIsSaving(true)
        try {
            const body = {
                name: name.trim(),
                description: description.trim(),
                image: imageUrl ? { url: imageUrl, publicId: imagePublicId || null } : { url: null, publicId: null },
                isActive,
                categoryIds: linkedIds,
            }
            const response = await apiFetch(editing ? `/sub-categories/${editing._id}` : "/sub-categories", {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify(body),
            })
            if (!response.ok) throw new Error(await readError(response, "Failed to save"))
            toast.success(editing ? "Sub-category updated" : "Sub-category created")
            setIsFormOpen(false)
            load()
        } catch (error: any) {
            toast.error(error.message || "Failed to save")
        } finally {
            setIsSaving(false)
        }
    }

    async function confirmDelete() {
        if (!deleting) return
        try {
            const response = await apiFetch(`/sub-categories/${deleting._id}`, { method: "DELETE" })
            if (!response.ok) throw new Error(await readError(response, "Failed to delete"))
            toast.success("Sub-category deleted")
            setDeleting(null)
            load()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete")
        }
    }

    // Order inside one category (only when the list is filtered to it).
    async function move(sub: SubCategory, direction: -1 | 1) {
        if (categoryFilter === "all") return
        const index = visible.findIndex((item) => item._id === sub._id)
        const target = index + direction
        if (target < 0 || target >= visible.length) return
        const next = [...visible]
        ;[next[index], next[target]] = [next[target], next[index]]
        setSubs(next)
        const response = await apiFetch("/sub-categories/reorder", {
            method: "PATCH",
            body: JSON.stringify({ categoryId: categoryFilter, subCategoryIds: next.map((item) => item._id) }),
        })
        if (!response.ok) {
            toast.error(await readError(response, "Failed to reorder"))
            load()
        }
    }

    async function loadPlaced(sub: SubCategory, categoryId: string) {
        if (!categoryId) return
        setIsLoadingPlaced(true)
        try {
            const response = await apiFetch(`/sub-categories/${sub._id}/products?categoryId=${encodeURIComponent(categoryId)}`)
            if (!response.ok) throw new Error(await readError(response, "Failed to load products"))
            const payload = await response.json()
            setPlaced(Array.isArray(payload.data) ? payload.data : [])
        } catch (error: any) {
            toast.error(error.message || "Failed to load products")
        } finally {
            setIsLoadingPlaced(false)
        }
    }

    function openProducts(sub: SubCategory, categoryId?: string) {
        const first = categoryId || sub.categories[0]?.categoryId || ""
        setProductsFor(sub)
        setProductsCategory(first)
        setPlaced([])
        setProductSearch("")
        setSearchResults([])
        loadPlaced(sub, first)
    }

    async function searchProducts(event?: React.FormEvent) {
        event?.preventDefault()
        if (!productSearch.trim()) return setSearchResults([])
        setIsSearching(true)
        try {
            const response = await apiFetch(`/admin/products?search=${encodeURIComponent(productSearch.trim())}&limit=20`)
            if (!response.ok) throw new Error(await readError(response, "Search failed"))
            const payload = await response.json()
            const items = Array.isArray(payload.data) ? payload.data : payload.data?.products || []
            setSearchResults(items.map((item: any) => ({
                _id: String(item._id || item.id),
                name: item.name,
                sku: item.sku,
                brand: item.company?.name || item.brand || "",
                image: item.images?.find((image: any) => image.isPrimary)?.url || item.images?.[0]?.url || null,
            })))
        } catch (error: any) {
            toast.error(error.message || "Search failed")
        } finally {
            setIsSearching(false)
        }
    }

    async function addProduct(product: PlacedProduct) {
        if (!productsFor) return
        const response = await apiFetch(`/sub-categories/${productsFor._id}/products`, {
            method: "POST",
            body: JSON.stringify({ categoryId: productsCategory, productIds: [product._id], alsoInCategory: addAlsoInCategory }),
        })
        if (!response.ok) return toast.error(await readError(response, "Failed to add"))
        const payload = await response.json()
        const skipped = payload.data?.skipped?.[0]
        if (skipped) return toast.error(`${skipped.name}: ${skipped.reason}`)
        toast.success(`${product.name} added`)
        loadPlaced(productsFor, productsCategory)
        load()
    }

    // Also show these in the category's own list, or only under the sub-category.
    async function setAlsoInCategory(products: PlacedProduct[], alsoInCategory: boolean) {
        if (!productsFor || products.length === 0) return
        const response = await apiFetch(`/sub-categories/${productsFor._id}/products`, {
            method: "PATCH",
            body: JSON.stringify({ categoryId: productsCategory, productIds: products.map((product) => product._id), alsoInCategory }),
        })
        if (!response.ok) return toast.error(await readError(response, "Failed to update"))
        setPlaced((rows) => rows.map((row) => products.some((product) => product._id === row._id) ? { ...row, alsoInCategory } : row))
        toast.success(products.length === 1
            ? `${products[0].name}: ${alsoInCategory ? "in both lists" : "only in this sub-category"}`
            : `${products.length} products: ${alsoInCategory ? "in both lists" : "only in this sub-category"}`)
    }

    async function removeProduct(product: PlacedProduct) {
        if (!productsFor) return
        const response = await apiFetch(
            `/sub-categories/${productsFor._id}/products/${product._id}?categoryId=${encodeURIComponent(productsCategory)}`,
            { method: "DELETE" },
        )
        if (!response.ok) return toast.error(await readError(response, "Failed to remove"))
        toast.success(`${product.name} removed from this sub-category (it shows in the category list)`)
        loadPlaced(productsFor, productsCategory)
        load()
    }

    const categoryName = (id: string) => categories.find((category) => category._id === id)?.name || "Category"
    const placedIds = new Set(placed.map((product) => product._id))
    const filteredCategoryOptions = topCategories.filter((category) =>
        !categorySearch.trim() || category.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Layers className="h-8 w-8 text-[#86efac]" />
                    <div>
                        <h1 className="text-3xl font-bold text-white">Sub-categories</h1>
                        <p className="text-sm text-gray-400">
                            Made once, shown under any number of categories. Products are placed as &quot;Category › Sub-category&quot;.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">
                        <NextLink href="/categories"><FolderTree className="mr-2 h-4 w-4" />Categories</NextLink>
                    </Button>
                    <Button onClick={openCreate} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">
                        <Plus className="mr-2 h-4 w-4" />Add Sub-category
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search sub-categories by name..."
                        className="border-[#333] bg-[#161616] pl-10 text-white placeholder:text-gray-500"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full border-[#333] bg-[#161616] text-white sm:w-64">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="border-[#333] bg-[#0D0D0D]">
                        <SelectItem value="all">All categories</SelectItem>
                        {topCategories.map((category) => (
                            <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {categoryFilter !== "all" && (
                <p className="text-xs text-gray-500">
                    Use the arrows to set the order of these cards inside {categoryName(categoryFilter)} (as shoppers see them).
                </p>
            )}

            {/* List */}
            {isLoading ? (
                <div className="rounded-xl border border-[#333] bg-[#161616]"><TableSkeleton rows={5} columns={5} /></div>
            ) : visible.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-[#333] bg-[#161616] text-gray-400">
                    <Layers className="mb-4 h-12 w-12 opacity-50" />
                    <p>No sub-categories yet</p>
                    <p className="text-sm">Add one, e.g. &quot;Blades&quot;, and choose the categories it shows in</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[#333] bg-[#161616]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#333] hover:bg-transparent">
                                <TableHead className="text-gray-400">Image</TableHead>
                                <TableHead className="text-gray-400">Name</TableHead>
                                <TableHead className="text-gray-400">Shown in (products)</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-right text-gray-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((sub, index) => (
                                <TableRow key={sub._id} className="border-[#333]">
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {categoryFilter !== "all" && (
                                                <div className="flex flex-col">
                                                    <button disabled={index === 0} onClick={() => move(sub, -1)} aria-label={`Move ${sub.name} up`} className="text-gray-400 hover:text-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                                                    <button disabled={index === visible.length - 1} onClick={() => move(sub, 1)} aria-label={`Move ${sub.name} down`} className="text-gray-400 hover:text-white disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                                                </div>
                                            )}
                                            {sub.image?.url ? (
                                                <img src={sub.image.url} alt={sub.name} className="h-10 w-10 rounded-lg bg-[#0D0D0D] object-cover" />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D0D0D]"><Layers className="h-5 w-5 text-gray-500" /></div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        <div>{sub.name}</div>
                                        <div className="text-xs font-normal text-gray-600">{sub.slug}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5">
                                            {sub.categories.length === 0 && <span className="text-xs text-gray-500">Not shown anywhere</span>}
                                            {sub.categories.map((link) => (
                                                <button
                                                    key={link.categoryId}
                                                    onClick={() => openProducts(sub, link.categoryId)}
                                                    title={`Manage products in ${link.name} › ${sub.name}`}
                                                    className="inline-flex items-center gap-1 rounded-full border border-[#333] bg-[#0D0D0D] px-2.5 py-1 text-xs text-gray-300 hover:border-[#86efac] hover:text-white"
                                                >
                                                    {link.name}
                                                    <span className="inline-flex items-center gap-0.5 text-gray-500"><Package className="h-3 w-3" />{link.productCount}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sub.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                                            {sub.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 text-[#86efac] hover:bg-[#86efac]/10" onClick={() => openProducts(sub)} disabled={sub.categories.length === 0}>
                                                <Package className="mr-1 h-4 w-4" />Products
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:bg-blue-400/10 hover:text-blue-300" onClick={() => openEdit(sub)} aria-label={`Edit ${sub.name}`}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {isAdmin && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-400/10 hover:text-red-300" onClick={() => setDeleting(sub)} aria-label={`Delete ${sub.name}`}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Create / edit */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto border-[#333] bg-[#161616] text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit sub-category" : "Add sub-category"}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            e.g. &quot;Blades&quot; shown in Brush Cutter and Chain Saw. Each category only lists the products you place under it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium">Name</label>
                            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Blades" className="border-[#333] bg-[#0D0D0D] text-white" />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Show in categories</label>
                            <Input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Find a category..." className="mb-2 border-[#333] bg-[#0D0D0D] text-white" />
                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#333] bg-[#0D0D0D] p-2">
                                {filteredCategoryOptions.map((category) => {
                                    const checked = linkedIds.includes(category._id)
                                    return (
                                        <label key={category._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[#1A1A1A]">
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={(value) => setLinkedIds((ids) => value ? [...ids, category._id] : ids.filter((id) => id !== category._id))}
                                            />
                                            {category.name}
                                        </label>
                                    )
                                })}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{linkedIds.length} selected</p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Description (optional)</label>
                            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" rows={2} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium">Image (optional)</label>
                            <div className="flex items-center gap-3">
                                {imageUrl ? (
                                    <div className="relative">
                                        <img src={imageUrl} alt="" className="h-16 w-16 rounded-lg bg-[#0D0D0D] object-cover" />
                                        <button onClick={() => { setImageUrl(""); setImagePublicId("") }} aria-label="Remove image" className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white"><X className="h-3 w-3" /></button>
                                    </div>
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#0D0D0D] text-gray-600"><Layers className="h-6 w-6" /></div>
                                )}
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm hover:bg-[#1A1A1A]">
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    Upload
                                    <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={isUploading} />
                                </label>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Without one, shoppers see a photo of one of its products.</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-[#333] bg-[#0D0D0D] px-3 py-2">
                            <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="text-xs text-gray-500">Off hides it from shoppers everywhere.</p>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)} className="border-[#333] bg-transparent text-white hover:bg-[#1A1A1A]">Cancel</Button>
                        <Button onClick={save} disabled={isSaving} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Products in Category › Sub-category */}
            <Dialog open={productsFor !== null} onOpenChange={(open) => !open && setProductsFor(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto border-[#333] bg-[#161616] text-white sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Products in {categoryName(productsCategory)} › {productsFor?.name}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Shoppers opening {categoryName(productsCategory)} → {productsFor?.name} see exactly these.
                        </DialogDescription>
                    </DialogHeader>
                    {productsFor && productsFor.categories.length > 1 && (
                        <Select value={productsCategory} onValueChange={(value) => { setProductsCategory(value); loadPlaced(productsFor, value) }}>
                            <SelectTrigger className="border-[#333] bg-[#0D0D0D] text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="border-[#333] bg-[#0D0D0D]">
                                {productsFor.categories.map((link) => (
                                    <SelectItem key={link.categoryId} value={link.categoryId}>{link.name} › {productsFor.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">Placed here ({placed.length})</p>
                            {placed.length > 1 && (
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-300 hover:bg-[#1A1A1A]" onClick={() => setAlsoInCategory(placed.filter((product) => !product.alsoInCategory), true)}>All in both</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-300 hover:bg-[#1A1A1A]" onClick={() => setAlsoInCategory(placed.filter((product) => product.alsoInCategory), false)}>All sub-category only</Button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            Switch on &quot;Also in {categoryName(productsCategory)}&quot; to show a product in the {categoryName(productsCategory)} list too; off, it shows only under {productsFor?.name}.
                        </p>
                        {isLoadingPlaced ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                        ) : placed.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-[#333] p-4 text-center text-sm text-gray-500">No products yet. Find and add them below.</p>
                        ) : (
                            <div className="max-h-56 space-y-1 overflow-y-auto">
                                {placed.map((product) => (
                                    <div key={product._id} className="flex items-center gap-3 rounded-lg bg-[#0D0D0D] px-3 py-2">
                                        {product.image ? <img src={product.image} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-[#1A1A1A]" />}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm">{product.name}</p>
                                            <p className="truncate text-xs text-gray-500">{[product.brand, product.sku].filter(Boolean).join(" · ")}</p>
                                        </div>
                                        <span className={`hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline ${product.alsoInCategory ? "bg-sky-500/15 text-sky-300" : "bg-amber-500/15 text-amber-300"}`}>
                                            {product.alsoInCategory ? "Both" : "Sub only"}
                                        </span>
                                        <label className="flex items-center gap-1.5 text-xs text-gray-400" title={`Also show in the ${categoryName(productsCategory)} list`}>
                                            <Switch checked={Boolean(product.alsoInCategory)} onCheckedChange={(value) => setAlsoInCategory([product], value)} />
                                            Also in {categoryName(productsCategory)}
                                        </label>
                                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-400/10" onClick={() => removeProduct(product)}>Remove</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-[#333] bg-[#0D0D0D] px-3 py-2 text-sm">
                        <span>
                            Also keep new ones in the {categoryName(productsCategory)} list
                            <span className="block text-xs text-gray-500">Off: they show only under {productsFor?.name}.</span>
                        </span>
                        <Switch checked={addAlsoInCategory} onCheckedChange={setAddAlsoInCategory} />
                    </label>
                    <form onSubmit={searchProducts} className="flex gap-2">
                        <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find products by name or SKU to add..." className="border-[#333] bg-[#0D0D0D] text-white" />
                        <Button type="submit" variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                        </Button>
                    </form>
                    {searchResults.length > 0 && (
                        <div className="max-h-56 space-y-1 overflow-y-auto">
                            {searchResults.map((product) => (
                                <div key={product._id} className="flex items-center gap-3 rounded-lg border border-[#333] px-3 py-2">
                                    {product.image ? <img src={product.image} alt="" className="h-9 w-9 rounded object-cover" /> : <div className="h-9 w-9 rounded bg-[#1A1A1A]" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm">{product.name}</p>
                                        <p className="truncate text-xs text-gray-500">{[product.brand, product.sku].filter(Boolean).join(" · ")}</p>
                                    </div>
                                    {placedIds.has(product._id) ? (
                                        <span className="text-xs text-gray-500">Added</span>
                                    ) : (
                                        <Button size="sm" className="bg-[#86efac] text-black hover:bg-[#86efac]/90" onClick={() => addProduct(product)}>Add</Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete */}
            <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
                <DialogContent className="border-[#333] bg-[#161616] text-white">
                    <DialogHeader>
                        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            It disappears from every category. Sub-categories that still have products can&apos;t be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleting(null)} className="border-[#333] bg-transparent text-white hover:bg-[#1A1A1A]">Cancel</Button>
                        <Button onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

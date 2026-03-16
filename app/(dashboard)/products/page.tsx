"use client"

import Link from "next/link"
import { Plus, Loader2, Pencil, Trash2, Eye, LayoutGrid, List, Package, Star, Languages } from "lucide-react"
import { useEffect, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

interface Product {
    _id: string
    name: string
    category: string
    retailPrice: number
    stock: number
    status: string
    sku: string
    rating: number
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list')
    const [isConvertingHindi, setIsConvertingHindi] = useState(false)

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        try {
            const res = await apiFetch('/admin/products')
            const data = await res.json()
            if (res.ok) {
                setProducts(data.data || [])
            } else {
                toast.error("Failed to fetch products")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteProduct(productId: string) {
        const confirmed = window.confirm("Are you sure you want to archive this product? It will no longer be visible in the app.")
        if (!confirmed) return

        try {
            const res = await apiFetch(`/admin/products/${productId}`, {
                method: 'DELETE',
            })
            const data = await res.json()

            if (res.ok) {
                toast.success("Product archived successfully")
                fetchProducts()
            } else {
                toast.error(data.message || "Failed to delete product")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        }
    }

    async function convertMissingHindiNames() {
        const confirmed = window.confirm(
            "Convert missing Hindi names for all products that don't have Hindi text yet?"
        )
        if (!confirmed) return

        setIsConvertingHindi(true)
        try {
            const res = await apiFetch('/admin/products/hindi-names/generate-missing', {
                method: 'POST',
                body: JSON.stringify({}),
            })
            const data = await res.json()

            if (!res.ok || !data?.success) {
                toast.error(data?.message || "Failed to convert Hindi names")
                return
            }

            const stats = data.data || {}
            toast.success(
                `Hindi conversion done: ${stats.updated ?? 0} updated, ${stats.skipped ?? 0} skipped (processed ${stats.processed ?? 0}).`
            )
            fetchProducts()
        } catch (error) {
            console.error(error)
            toast.error("Error converting Hindi names")
        } finally {
            setIsConvertingHindi(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Products</h1>
                    <p className="text-gray-400">Manage your product catalog.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={convertMissingHindiNames}
                        disabled={isConvertingHindi}
                        variant="outline"
                        className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                    >
                        {isConvertingHindi ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Languages className="mr-2 h-4 w-4" />
                        )}
                        Convert Missing Hindi Names
                    </Button>
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
                    <Link href="/products/add" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#86efac] text-black hover:bg-[#86efac]/90 h-10 px-4 py-2">
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Link>
                </div>
            </div>

            {/* Products Content */}
            {isLoading ? (
                <div className="bg-[#161616] rounded-2xl min-h-[400px] border border-[#333] flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                </div>
            ) : products.length === 0 ? (
                <div className="bg-[#161616] rounded-2xl min-h-[400px] border border-[#333] flex flex-col items-center justify-center text-gray-400">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p>No products found</p>
                    <p className="text-sm">Add your first product to get started</p>
                </div>
            ) : viewMode === 'list' ? (
                /* List View */
                <div className="bg-[#161616] rounded-2xl border border-[#333] overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                <TableHead className="text-gray-400">Name</TableHead>
                                <TableHead className="text-gray-400">SKU</TableHead>
                                <TableHead className="text-gray-400">Category</TableHead>
                                <TableHead className="text-gray-400 text-right">Price</TableHead>
                                <TableHead className="text-gray-400 text-right">Stock</TableHead>
                                <TableHead className="text-gray-400 text-center">Rating</TableHead>
                                <TableHead className="text-gray-400 text-center">Status</TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product._id} className="border-[#333] hover:bg-[#1A1A1A]">
                                    <TableCell className="text-white font-medium">{product.name}</TableCell>
                                    <TableCell className="text-gray-400">{product.sku}</TableCell>
                                    <TableCell className="text-white">
                                        <Badge variant="outline" className="border-[#333] text-gray-300">
                                            {product.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-white text-right">₹{product.retailPrice.toLocaleString()}</TableCell>
                                    <TableCell className="text-white text-right">{product.stock}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-500">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span className="text-xs">{product.rating || '4.5'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`${product.status === 'active' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' :
                                            'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                                            }`}>
                                            {product.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#333]">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Link href={`/products/edit/${product._id}`}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => deleteProduct(product._id)}>
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
                    {products.map((product) => (
                        <div
                            key={product._id}
                            className="bg-[#161616] rounded-xl border border-[#333] p-4 hover:border-[#444] transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 rounded-xl bg-[#0D0D0D] flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-500" />
                                </div>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-[#333]">
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Link href={`/products/edit/${product._id}`}>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => deleteProduct(product._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <h3 className="font-semibold text-white text-base mb-1 line-clamp-1">{product.name}</h3>
                            <p className="text-gray-500 text-xs mb-3">SKU: {product.sku}</p>
                            <div className="flex items-center justify-between mb-3">
                                <Badge variant="outline" className="border-[#333] text-gray-300 text-xs">
                                    {product.category}
                                </Badge>
                                <Badge className={`text-xs ${product.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                    'bg-gray-500/10 text-gray-500'
                                    }`}>
                                    {product.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="h-3 w-3 fill-current" />
                                    <span className="text-xs font-medium">{product.rating || '4.5'}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                                <div>
                                    <p className="text-[#86efac] font-bold text-lg">₹{product.retailPrice.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs">Stock</p>
                                    <p className="text-white font-medium">{product.stock}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

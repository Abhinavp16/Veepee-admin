"use client"

import Link from "next/link"
import { Plus, Loader2, Pencil, Trash2, Eye } from "lucide-react"
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

interface Product {
    _id: string
    name: string
    category: string
    retailPrice: number
    stock: number
    status: string
    sku: string
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        try {
            const res = await fetch('http://localhost:5000/api/v1/admin/products', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Products</h1>
                    <p className="text-gray-400">Manage your product catalog.</p>
                </div>
                <Link href="/products/add" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#86efac] text-black hover:bg-[#86efac]/90 h-10 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                </Link>
            </div>

            <div className="bg-[#161616] rounded-2xl min-h-[500px] border border-[#333]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center text-gray-500 py-20">
                        No products found. Add one above!
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                <TableHead className="text-gray-400">Name</TableHead>
                                <TableHead className="text-gray-400">SKU</TableHead>
                                <TableHead className="text-gray-400">Category</TableHead>
                                <TableHead className="text-gray-400 text-right">Price</TableHead>
                                <TableHead className="text-gray-400 text-right">Stock</TableHead>
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
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}

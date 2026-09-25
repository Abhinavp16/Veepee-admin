"use client"

import { useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

// This page redirects to the unified add/edit page
export default function EditProductRedirect() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const productId = params.id as string

    useEffect(() => {
        // Redirect to the add page with edit query param
        const next = new URLSearchParams(searchParams.toString())
        next.set("edit", productId)
        router.replace(`/products/add?${next.toString()}`)
    }, [productId, router, searchParams])

    return (
        <div className="flex justify-center items-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
        </div>
    )
}

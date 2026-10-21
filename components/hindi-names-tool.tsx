"use client"

import { useState } from "react"
import { Languages, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"

// Maintenance: fills in Hindi names for products that only have English ones.
export function HindiNamesTool() {
    const [isConverting, setIsConverting] = useState(false)

    async function convertMissingHindiNames() {
        if (!window.confirm("Add Hindi names to every product that doesn't have one yet?")) return
        setIsConverting(true)
        try {
            const res = await apiFetch("/admin/products/hindi-names/generate-missing", { method: "POST", body: JSON.stringify({}) })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.success) {
                toast.error(data?.message || "Couldn't add Hindi names")
                return
            }
            const stats = data.data || {}
            toast.success(`Hindi names: ${stats.updated ?? 0} added, ${stats.skipped ?? 0} skipped (${stats.processed ?? 0} products checked).`)
        } catch {
            toast.error("Couldn't add Hindi names")
        } finally {
            setIsConverting(false)
        }
    }

    return (
        <Card className="bg-[#161616] border-[#333]">
            <CardHeader>
                <CardTitle className="text-white">Maintenance</CardTitle>
                <CardDescription>One-off tools for the product catalogue</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Add Hindi names to products that only have English names.</p>
                <Button type="button" variant="outline" onClick={convertMissingHindiNames} disabled={isConverting} className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">
                    {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
                    Add missing Hindi names
                </Button>
            </CardContent>
        </Card>
    )
}

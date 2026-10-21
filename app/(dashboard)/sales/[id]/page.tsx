"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { SaleEditor } from "@/components/sales/sale-editor"

export default function EditSalePage() {
    const params = useParams<{ id: string | string[] }>()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    if (!/^[a-f\d]{24}$/i.test(id || "")) {
        return (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-[#919191]">
                <p>This sale link is not valid.</p>
                <Link href="/sales" className="text-sm text-sky-300 hover:underline">Back to sales</Link>
            </div>
        )
    }
    return <SaleEditor key={id} saleId={id} />
}

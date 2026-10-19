"use client"

import { useRef, useState } from "react"
import { ChevronDown, Download, FileText, Loader2, Printer, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadReceipt, fetchReceipt, printReceipt, shareReceipt } from "@/lib/receipt"

interface ReceiptMenuProps {
    orderId: string
    orderNumber?: string | null
    size?: "sm" | "md"
}

type Action = "download" | "share" | "print"

// "Receipt ▾" → Download / Share / Print the order receipt PDF.
export function ReceiptMenu({ orderId, orderNumber, size = "sm" }: ReceiptMenuProps) {
    const [busy, setBusy] = useState<Action | null>(null)
    const [open, setOpen] = useState(false)
    const cached = useRef<File | null>(null)

    async function run(action: Action) {
        setBusy(action)
        try {
            const file = cached.current || await fetchReceipt("/admin", orderId)
            cached.current = file
            if (action === "download") {
                downloadReceipt(file)
                toast.success(`Downloaded ${file.name}`)
            } else if (action === "print") {
                printReceipt(file)
            } else {
                const result = await shareReceipt(file)
                if (result === "downloaded") {
                    toast.info("This browser can't share files, so the PDF was downloaded. Attach it in WhatsApp or email.")
                }
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not load the receipt")
        } finally {
            setBusy(null)
            // Stays open while the PDF loads (spinner), closes when done.
            setOpen(false)
        }
    }

    const item = (action: Action, label: string, Icon: typeof Download) => (
        <DropdownMenuItem
            onSelect={(event) => {
                event.preventDefault()
                if (!busy) void run(action)
            }}
            className="gap-2.5 py-2 text-sm"
        >
            {busy === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {label}
        </DropdownMenuItem>
    )

    return (
        <DropdownMenu open={open} onOpenChange={(next) => !busy && setOpen(next)}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Receipt${orderNumber ? ` for ${orderNumber}` : ""}`}
                    className={`gap-1.5 rounded-full border-[#86efac]/40 bg-[#86efac]/10 font-semibold text-[#86efac] hover:bg-[#86efac]/20 hover:text-[#86efac] ${size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm"}`}
                >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    Receipt
                    <ChevronDown className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {orderNumber && <DropdownMenuLabel className="text-[11px] font-semibold text-gray-400">{orderNumber}</DropdownMenuLabel>}
                {orderNumber && <DropdownMenuSeparator />}
                {item("download", "Download PDF", Download)}
                {item("share", "Share", Share2)}
                {item("print", "Print", Printer)}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

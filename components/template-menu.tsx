"use client"

import NextLink from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * "Add saved set ▾" / "Insert saved text ▾": the saved templates of one kind,
 * with a link to Settings to manage them.
 */
export function TemplateMenu<T extends { name: string }>({ label, heading, items, onPick, preview }: {
    label: string
    heading: string
    items: T[]
    onPick: (item: T) => void
    preview: (item: T) => string
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="border-[#333] text-gray-200">
                    {label} <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#161616] border-[#333] text-white w-72">
                <DropdownMenuLabel className="text-gray-400 text-xs">{heading}</DropdownMenuLabel>
                {items.length === 0 && <p className="px-2 py-2 text-xs text-gray-500">None saved yet.</p>}
                {items.map((item, index) => (
                    <DropdownMenuItem key={`${item.name}-${index}`} onClick={() => onPick(item)} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-semibold">{item.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-2">{preview(item)}</span>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuItem asChild>
                    <NextLink href="/settings" className="text-xs text-[#86efac]">Manage in Settings → Product templates</NextLink>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"

/** One file from a download route: a link that saves it under [name]. */
export interface DownloadFile {
    name: string
    url: string
    /** "current", "rejected-1" … for payment screenshots. */
    label?: string
    /** False when the server couldn't make a download link for it. */
    signed?: boolean
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Saves each file through a hidden frame (the links tell the browser to save,
 * and a missing file can never take this page away), a short gap between
 * them so the browser takes them all.
 */
async function saveFiles(files: DownloadFile[]) {
    for (const [index, file] of files.entries()) {
        if (index > 0) await wait(700)
        const frame = document.createElement("iframe")
        frame.style.display = "none"
        frame.src = file.url
        document.body.appendChild(frame)
        setTimeout(() => frame.remove(), 60000)
    }
}

/**
 * Downloads photos customers sent through an admin download route
 * ([path] answers { files, signed }). [pick] chooses which of the files to
 * save; leave it out for all of them. [expected] is how many files the page
 * shows: when the server has a different number, the page is out of date.
 */
export function useFileDownload(path: string | null) {
    const [busy, setBusy] = useState<string | null>(null)

    async function download(
        key: string,
        pick?: (file: DownloadFile, index: number) => boolean,
        expected?: number,
    ) {
        if (!path) return
        if (busy) {
            toast.message("One download is already starting. Please wait a moment.")
            return
        }
        setBusy(key)
        try {
            const res = await apiFetch(path)
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                toast.error(body?.error?.message || body?.message || "Couldn't download. Please try again.")
                return
            }
            const all: DownloadFile[] = Array.isArray(body?.data?.files) ? body.data.files : []
            if (expected !== undefined && all.length !== expected) {
                toast.error("These photos have changed since the page loaded. Reload to see the latest ones.")
                return
            }
            const files = pick ? all.filter(pick) : all
            if (files.length === 0) {
                toast.error("Nothing to download.")
                return
            }
            if (files.some((file) => file.signed === false)) {
                toast.error("Downloads aren't available right now. Please try again later.")
                return
            }
            await saveFiles(files)
            toast.success(files.length === 1 ? `Downloading ${files[0].name}` : `Downloading ${files.length} photos`)
        } catch {
            toast.error("Couldn't download. Check your connection and try again.")
        } finally {
            setBusy(null)
        }
    }

    return { download, busy }
}

/** A small "Download" / "Download all" button. */
export function DownloadButton({
    label,
    busy,
    onClick,
    ariaLabel,
}: {
    label: string
    busy: boolean
    onClick: () => void
    ariaLabel?: string
}) {
    return (
        <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClick}
            disabled={busy}
            aria-label={ariaLabel}
            className="h-8 border-[#333] bg-transparent text-white hover:bg-[#1A1A1A]"
        >
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
            {label}
        </Button>
    )
}

/** A download icon over a photo thumbnail. */
export function DownloadIconButton({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            aria-label={label}
            title={label}
            className="absolute bottom-1 left-1 rounded bg-black/70 p-1 text-[#ffffff] transition-colors hover:bg-[#86efac] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/60 disabled:opacity-60"
        >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
    )
}

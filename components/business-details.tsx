"use client"

import { useEffect, useState } from "react"
import { ExternalLink, ImageOff, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate, formatDateTime } from "@/lib/format"
import type { BusinessInfo, PreviousApplication } from "@/lib/wholesaler-applications"

/** True once the signed proof links have stopped working. */
function useLinksExpired(expiresAt?: string | null) {
    const [expired, setExpired] = useState(false)
    useEffect(() => {
        setExpired(false)
        if (!expiresAt) return
        const left = new Date(expiresAt).getTime() - Date.now()
        if (Number.isNaN(left)) return
        if (left <= 0) { setExpired(true); return }
        const timer = setTimeout(() => setExpired(true), left)
        return () => clearTimeout(timer)
    }, [expiresAt])
    return expired
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
    return (
        <div className={wide ? "sm:col-span-2" : undefined}>
            <dt className="mb-0.5 text-xs text-gray-500">{label}</dt>
            <dd className="break-words text-sm text-white">{children}</dd>
        </div>
    )
}

const dash = <span className="text-gray-500">—</span>

/** "Rejected on 3 Nov 2026 by Asha" for an earlier decision. */
function previousLine(item: PreviousApplication) {
    if (item.status === "removed") {
        return `Wholesale access removed${item.removedAt ? ` on ${formatDate(item.removedAt)}` : ""}${item.removalReason ? `: “${item.removalReason}”` : ""}`
    }
    const verb = item.status === "accepted" ? "Accepted" : "Rejected"
    return `${verb} before${item.reviewedAt ? ` on ${formatDate(item.reviewedAt)}` : ""}${item.reviewedBy?.name ? ` by ${item.reviewedBy.name}` : ""}`
}

/**
 * A wholesaler application's business details and proof photos (Account
 * Upgrades and Customers). Photos are signed links that work for 15 minutes:
 * when they have expired (or a photo won't load), Reload fetches fresh ones.
 */
export function BusinessDetails({
    info,
    statusLabel,
    onReload,
    reloading = false,
}: {
    info: BusinessInfo
    /** Shown as "Status"; leave out to hide the row. */
    statusLabel?: string
    /** Fetches the record again (fresh photo links). */
    onReload?: () => void
    reloading?: boolean
}) {
    const proofs = info.proofImages || []
    const linksExpired = useLinksExpired(info.proofLinksExpireAt)
    const [broken, setBroken] = useState<Record<number, boolean>>({})
    useEffect(() => setBroken({}), [info.proofImages])
    // The server couldn't sign the links: they won't open, and reloading
    // won't help until storage is fixed.
    const unsigned = info.proofLinksSigned === false && proofs.length > 0
    const needsReload = !unsigned && (linksExpired || Object.values(broken).some(Boolean))
    const previous = [...(info.previousApplications || [])].reverse()
    const gst = info.gstNumber || info.gstIn
    const reviewer = info.reviewedBy?.name

    return (
        <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <Field label="Business name" wide>{info.businessName || dash}</Field>
                <Field label="GST number">{gst ? <span className="font-mono">{gst}</span> : dash}</Field>
                <Field label="Contact person">{info.contactPerson || dash}</Field>
                <Field label="Contact number">{info.contactPhone ? <a href={`tel:${info.contactPhone}`} className="text-[#86efac] hover:underline">{info.contactPhone}</a> : dash}</Field>
                <Field label="Applied on">{info.appliedAt ? formatDateTime(info.appliedAt) : dash}</Field>
                <Field label="Business address" wide><span className="whitespace-pre-wrap">{info.businessAddress || dash}</span></Field>
                {statusLabel && <Field label="Status">{statusLabel}</Field>}
                {(info.reviewedAt || reviewer) && (
                    <Field label="Reviewed">
                        {[reviewer && `by ${reviewer}`, info.reviewedAt && formatDateTime(info.reviewedAt)].filter(Boolean).join(", ")}
                    </Field>
                )}
                {info.removedAt && <Field label="Removed on">{formatDate(info.removedAt)}</Field>}
                {(info.removalReason || info.removedAt) && (
                    <Field label="Removal reason" wide>
                        {info.removalReason
                            ? <>{info.removalReason} <span className="text-xs text-gray-500">({info.removalReasonShared ? "shown to the customer" : "team only"})</span></>
                            : dash}
                    </Field>
                )}
            </dl>

            {previous.length > 0 && (
                <section aria-label="Earlier applications">
                    <h4 className="mb-1 text-sm font-semibold text-white">Earlier applications</h4>
                    <ul className="space-y-1 text-xs text-gray-400">
                        {previous.map((item, index) => (
                            <li key={`${item.status}-${item.reviewedAt || item.removedAt || index}`}>
                                {previousLine(item)}
                                {item.businessName ? <span className="text-gray-500"> · {item.businessName}</span> : null}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section aria-label="Proof photos">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">
                        Proof photos <span className="font-normal text-gray-500">({proofs.length || info.proofCount || 0})</span>
                    </h4>
                    {onReload && proofs.length > 0 && needsReload && (
                        <Button type="button" size="sm" variant="outline" onClick={onReload} disabled={reloading} className="h-8 border-[#333] bg-transparent text-white hover:bg-[#1A1A1A]">
                            {reloading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
                            Reload photos
                        </Button>
                    )}
                </div>
                {needsReload && proofs.length > 0 && (
                    <p className="mb-2 text-xs text-amber-500" role="status">
                        {linksExpired ? "These photo links have expired." : "A photo didn't load; its link may have expired."}
                        {onReload ? " Reload to see them again." : ""}
                    </p>
                )}
                {unsigned ? (
                    <p className="flex items-center gap-2 text-sm text-amber-500" role="status">
                        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Photos can&apos;t be shown right now. Please try again later.
                    </p>
                ) : proofs.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        {info.proofCount ? "Only administrators can see the proof photos." : "No proof photos."}
                    </p>
                ) : (
                    <ul className="flex flex-wrap gap-3">
                        {proofs.map((url, index) => (
                            <li key={url}>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open proof photo ${index + 1} of ${proofs.length} full size in a new tab`}
                                    className="group relative block h-28 w-28 overflow-hidden rounded-md border border-[#333] bg-[#0D0D0D] transition-colors hover:border-[#86efac]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/60"
                                >
                                    {broken[index] ? (
                                        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-gray-500">
                                            <ImageOff className="h-5 w-5" aria-hidden="true" />
                                            Not loaded
                                        </span>
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={url}
                                            alt={`Proof photo ${index + 1}`}
                                            loading="lazy"
                                            onError={() => setBroken((current) => ({ ...current, [index]: true }))}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    )}
                                    <span className="absolute bottom-1 right-1 rounded bg-black/60 p-1 text-[#ffffff] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

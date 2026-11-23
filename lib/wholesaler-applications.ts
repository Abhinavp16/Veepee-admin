// Wholesaler applications (Account Upgrades): GET
// /admin/wholesaler-applications?status=&search=&page=&limit= (admin only).
// Proof photos come as signed links that work for 15 minutes
// (businessInfo.proofLinksExpireAt); reload the record for fresh ones.

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "removed"

export const APPLICATION_STATUSES: ApplicationStatus[] = ["pending", "accepted", "rejected", "removed"]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    removed: "Removed",
}

export interface BusinessInfo {
    businessName?: string | null
    gstNumber?: string | null
    gstIn?: string | null
    businessAddress?: string | null
    contactPerson?: string | null
    contactPhone?: string | null
    status?: string
    verified?: boolean
    verifiedAt?: string | null
    appliedAt?: string | null
    reviewedAt?: string | null
    reviewedBy?: { id?: string | null; name?: string | null } | null
    removedAt?: string | null
    removalReason?: string | null
    removalReasonShared?: boolean
    /** Signed links (admins only). */
    proofImages?: string[]
    /** When the signed links stop working (null when they couldn't be signed). */
    proofLinksExpireAt?: string | null
    /** False when the server couldn't sign the photo links (they won't open). */
    proofLinksSigned?: boolean
    /** Staff see only how many photos there are. */
    proofCount?: number
    /** Earlier decisions, kept when they applied again (newest last). */
    previousApplications?: PreviousApplication[]
}

export interface PreviousApplication {
    status: "accepted" | "rejected" | "removed"
    businessName?: string | null
    gstNumber?: string | null
    appliedAt?: string | null
    reviewedAt?: string | null
    reviewedBy?: { id?: string | null; name?: string | null } | null
    removedAt?: string | null
    removalReason?: string | null
    removalReasonShared?: boolean
}

/**
 * The tab a customer record belongs under, from its business details
 * (older records without a status count as pending when a customer has a
 * business name), or null when there is no application.
 */
export function applicationStatusOf(role: string, info?: BusinessInfo | null): ApplicationStatus | null {
    const status = info?.status
    if (isApplicationStatus(status)) return status
    if ((status === undefined || status === null) && role === "buyer" && info?.businessName) return "pending"
    return null
}

export interface WholesalerApplication {
    _id: string
    name: string
    email?: string | null
    phone?: string | null
    role: string
    isActive?: boolean
    businessInfo?: BusinessInfo | null
    /** The tab it is listed under (older records without a status: pending). */
    applicationStatus: ApplicationStatus
    createdAt: string
    updatedAt: string
}

export type ApplicationCounts = Record<ApplicationStatus, number>

export const EMPTY_COUNTS: ApplicationCounts = { pending: 0, accepted: 0, rejected: 0, removed: 0 }

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
    return typeof value === "string" && (APPLICATION_STATUSES as string[]).includes(value)
}

/** The date a row is listed by, for its tab. */
export function applicationDate(application: WholesalerApplication): string | null {
    const info = application.businessInfo || {}
    switch (application.applicationStatus) {
        case "accepted":
            return info.reviewedAt || info.verifiedAt || info.appliedAt || application.updatedAt
        case "rejected":
            return info.reviewedAt || info.appliedAt || application.updatedAt
        case "removed":
            return info.removedAt || application.updatedAt
        default:
            return info.appliedAt || application.updatedAt
    }
}

// The sidebar's pending count listens for this, so it updates as soon as an
// application is accepted or rejected.
export const PENDING_UPGRADES_CHANGED = "veepee:pending-upgrades-changed"

export function announcePendingUpgradesChanged() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(PENDING_UPGRADES_CHANGED))
}

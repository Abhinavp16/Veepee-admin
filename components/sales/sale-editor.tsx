"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    ImagePlus,
    Loader2,
    Megaphone,
    Package,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from "lucide-react"
import { apiFetch, buildApiUrl } from "@/lib/api"
import { SALE_THEMES, saleHeaderBackground, timeUntil, type SaleStatus, type SaleThemeKey } from "@/lib/sale-themes"
import { SaleHeaderPreview } from "./sale-header-preview"
import { SaleStatusChip } from "./sale-status-chip"
import { useDashboardUser } from "@/components/dashboard-context"

type Audience = "customers" | "wholesalers" | "both"

interface PriceInfo {
    normalPrice: number | null
    salePrice: number | null
    percent: number | null
}

interface SaleProductRow {
    productId: string
    name: string
    sku?: string
    image?: string | null
    stock?: number
    mrp?: number | null
    customer?: PriceInfo
    wholesaler?: PriceInfo
    customerPercent: number | null
    wholesalerPercent: number | null
    saleQuantity: number | null
    // Most one account can buy at the sale price (null = no limit).
    perPersonLimit: number | null
    sold?: number
    remaining?: number | null
    warnings?: { code: string; text: string }[]
    missing?: boolean
    // Added since the last save.
    isNew?: boolean
}

interface SaleDetail {
    id: string
    name: string
    nameHindi: string
    subtitle: string
    subtitleHindi: string
    theme: SaleThemeKey
    heroImageUrl: string
    audience: Audience
    customerPercent: number | null
    wholesalerPercent: number | null
    startsAt: string
    endsAt: string
    endedAt: string | null
    status: SaleStatus
    savedStatus: "draft" | "published"
    lastAnnouncedAt: string | null
    results: { orders: number; units: number; revenue: number }
    products: SaleProductRow[]
}

interface ProductOption {
    _id: string
    name: string
    sku?: string
    stock?: number
    mrp?: number
    status?: string
}

// Everything the admin can change, as it sits in the form.
interface FormValues {
    name: string
    nameHindi: string
    subtitle: string
    subtitleHindi: string
    theme: SaleThemeKey
    heroImageUrl: string
    audience: Audience
    customerPercent: string
    wholesalerPercent: string
    startsAt: string
    endsAt: string
    rows: SaleProductRow[]
}

// Prices and warnings from POST /admin/sales/preview for one set of inputs.
interface PricePreview {
    key: string
    rows: Record<string, SaleProductRow> | null
    error: string | null
    productIds: string[]
}

// What GET /admin/sales/:id/announce says before announcing.
interface AnnounceInfo {
    recipients: number | null
    canAnnounce: boolean
    lastAt: string | null
    lastSentTo: number | null
}

const pad = (value: number) => String(value).padStart(2, "0")
// <input type="datetime-local"> works in the admin's own time zone.
function toLocalInput(value: string | Date) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : "")

function defaultTimes() {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    return { startsAt: toLocalInput(start), endsAt: toLocalInput(end) }
}

function blankValues(): FormValues {
    return {
        name: "",
        nameHindi: "",
        subtitle: "",
        subtitleHindi: "",
        theme: "diwali",
        heroImageUrl: "",
        audience: "customers",
        customerPercent: "25",
        wholesalerPercent: "",
        ...defaultTimes(),
        rows: [],
    }
}

function valuesOf(sale: SaleDetail): FormValues {
    return {
        name: sale.name,
        nameHindi: sale.nameHindi || "",
        subtitle: sale.subtitle || "",
        subtitleHindi: sale.subtitleHindi || "",
        theme: sale.theme,
        heroImageUrl: sale.heroImageUrl || "",
        audience: sale.audience,
        customerPercent: sale.customerPercent ? String(sale.customerPercent) : "",
        wholesalerPercent: sale.wholesalerPercent ? String(sale.wholesalerPercent) : "",
        startsAt: toLocalInput(sale.startsAt),
        endsAt: toLocalInput(sale.endsAt),
        rows: sale.products.map((row) => ({ ...row, productId: String(row.productId) })),
    }
}

const rowInputs = (row: SaleProductRow) =>
    [row.productId, row.customerPercent, row.wholesalerPercent, row.saleQuantity, row.perPersonLimit]

// The whole form, to tell whether anything changed since it was loaded or saved.
const snapshotOf = (values: FormValues) => JSON.stringify([
    values.name, values.nameHindi, values.subtitle, values.subtitleHindi, values.theme, values.heroImageUrl,
    values.audience, values.customerPercent, values.wholesalerPercent, values.startsAt, values.endsAt,
    values.rows.map(rowInputs),
])

// Only what changes the prices and warnings (the order of the rows doesn't).
const pricingKeyOf = (values: Pick<FormValues, "audience" | "customerPercent" | "wholesalerPercent" | "rows">) => JSON.stringify([
    values.audience, values.customerPercent.trim(), values.wholesalerPercent.trim(),
    values.rows.map(rowInputs).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
])

const shortDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
const dateTime = (value: string) => new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

function ago(value: string, now: number) {
    const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000))
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
    const days = Math.floor(hours / 24)
    return `${days} ${days === 1 ? "day" : "days"} ago`
}

// A row of the Sales list (enough to spot two sales running at once).
interface OtherSale {
    id: string
    name: string
    status: SaleStatus
    startsAt: string
    endsAt: string
}

const MAX_SALE_QUANTITY = 1_000_000
const MAX_PER_PERSON = 100_000

const isWholeIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max
// A row box: null when empty or not valid, else whole numbers within the range.
const badPercent = (value: number | null) => value != null && !isWholeIn(value, 1, 90)
const badCount = (value: number | null, max: number) => value != null && !isWholeIn(value, 1, max)

// The sale's own % box: a whole number from 1 to 90, else null.
const toPercent = (value: string) => {
    const number = Number(value)
    return value.trim() && isWholeIn(number, 1, 90) ? number : null
}
const percentTextIsBad = (value: string) => Boolean(value.trim()) && toPercent(value) == null

// What the admin typed in a row box, unrounded so mistakes can be pointed out.
function toNumberOrNull(value: string) {
    if (!value.trim()) return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function rowProblem(row: SaleProductRow, forCustomers: boolean, forWholesalers: boolean) {
    const name = row.name || "A product"
    if (forCustomers && badPercent(row.customerPercent)) return `${name}: the customer % must be a whole number from 1 to 90`
    if (forWholesalers && badPercent(row.wholesalerPercent)) return `${name}: the wholesaler % must be a whole number from 1 to 90`
    if (badCount(row.saleQuantity, MAX_SALE_QUANTITY)) return `${name}: the sale quantity must be a whole number from 1 to 1,000,000 (empty for no limit)`
    if (badCount(row.perPersonLimit, MAX_PER_PERSON)) return `${name}: max per person must be a whole number from 1 to 100,000 (empty for no limit)`
    return null
}

const rupees = (value: number | null | undefined) =>
    value == null ? "—" : `₹${Math.round(value).toLocaleString("en-IN")}`

const FIELD_LABELS: Record<string, string> = {
    customerPercent: "customer %",
    wholesalerPercent: "wholesaler %",
    saleQuantity: "sale quantity",
    perPersonLimit: "max per person",
}

// The server's message; a product's field ("products[3].customerPercent")
// is named after the product instead.
function errorMessage(body: any, fallback: string, rows: SaleProductRow[] = []) {
    const detail = Array.isArray(body?.error?.details) ? body.error.details[0] : null
    const message: string = detail?.message || body?.message || fallback
    const match = typeof detail?.field === "string" ? detail.field.match(/^products\.(\d+)(?:\.(\w+))?/) : null
    if (!match) return message
    const row = rows[Number(match[1])]
    const label = `${row?.name || "A product"}${match[2] && FIELD_LABELS[match[2]] ? ` ${FIELD_LABELS[match[2]]}` : ""}`
    return /^"[^"]*"/.test(message) ? message.replace(/^"[^"]*"/, label) : `${label}: ${message}`
}

// Products the server refused as archived or gone (SALE_PRODUCT_NOT_FOUND).
function refusedProductIds(body: any): string[] {
    if (body?.error?.code !== "SALE_PRODUCT_NOT_FOUND") return []
    const ids = body?.error?.details?.productIds ?? body?.details?.productIds
    return Array.isArray(ids) ? ids.map(String) : []
}

export function SaleEditor({ saleId }: { saleId?: string }) {
    // Staff can look at sales; only admins change or announce them.
    const isAdmin = useDashboardUser()?.role === "admin"
    const router = useRouter()
    const [initial] = useState(blankValues)
    const [isLoading, setIsLoading] = useState(Boolean(saleId))
    const [loadError, setLoadError] = useState<string | null>(null)
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    // Set at once on click, so a double click can't send twice.
    const busy = useRef(false)
    const [detail, setDetail] = useState<SaleDetail | null>(null)
    const [name, setName] = useState(initial.name)
    const [nameHindi, setNameHindi] = useState(initial.nameHindi)
    const [subtitle, setSubtitle] = useState(initial.subtitle)
    const [subtitleHindi, setSubtitleHindi] = useState(initial.subtitleHindi)
    const [theme, setTheme] = useState<SaleThemeKey>(initial.theme)
    const [heroImageUrl, setHeroImageUrl] = useState(initial.heroImageUrl)
    const [isUploading, setIsUploading] = useState(false)
    const [audience, setAudience] = useState<Audience>(initial.audience)
    const [customerPercent, setCustomerPercent] = useState(initial.customerPercent)
    const [wholesalerPercent, setWholesalerPercent] = useState(initial.wholesalerPercent)
    const [startsAt, setStartsAt] = useState(initial.startsAt)
    const [endsAt, setEndsAt] = useState(initial.endsAt)
    const [rows, setRows] = useState<SaleProductRow[]>(initial.rows)
    // The form as last loaded or saved: to spot unsaved changes, and
    // whether the prices on the rows still match the inputs.
    const [saved, setSaved] = useState(() => ({ snapshot: snapshotOf(initial), pricingKey: pricingKeyOf(initial) }))
    const [preview, setPreview] = useState<PricePreview | null>(null)
    // Products the last save was refused for (archived or gone).
    const [refusedIds, setRefusedIds] = useState<string[]>([])
    const [query, setQuery] = useState("")
    const [options, setOptions] = useState<ProductOption[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [confirm, setConfirm] = useState<null | "end" | "announce" | "delete">(null)
    const [announceInfo, setAnnounceInfo] = useState<AnnounceInfo | null>(null)
    const [announceProblem, setAnnounceProblem] = useState<string | null>(null)
    const announceRequest = useRef(0)
    const searchId = useRef(0)
    // "Starts in / Ends in" in the preview, refreshed every 30 seconds.
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30 * 1000)
        return () => window.clearInterval(timer)
    }, [])

    const status: SaleStatus = detail?.status || "draft"
    const isEnded = status === "ended"
    const isPublished = detail?.savedStatus === "published"
    // Announcing is for a sale that has started (a scheduled one turns live while the page is open).
    const isLive = status === "live" || (status === "upcoming" && detail != null && new Date(detail.startsAt).getTime() <= now)
    const forCustomers = audience !== "wholesalers"
    const forWholesalers = audience !== "customers"
    const formValues: FormValues = {
        name, nameHindi, subtitle, subtitleHindi, theme, heroImageUrl, audience,
        customerPercent, wholesalerPercent, startsAt, endsAt, rows,
    }
    const isDirty = !isLoading && (!saleId || Boolean(detail)) && !isEnded && snapshotOf(formValues) !== saved.snapshot

    function applyDetail(sale: SaleDetail) {
        const values = valuesOf(sale)
        setDetail(sale)
        setName(values.name)
        setNameHindi(values.nameHindi)
        setSubtitle(values.subtitle)
        setSubtitleHindi(values.subtitleHindi)
        setTheme(values.theme)
        setHeroImageUrl(values.heroImageUrl)
        setAudience(values.audience)
        setCustomerPercent(values.customerPercent)
        setWholesalerPercent(values.wholesalerPercent)
        setStartsAt(values.startsAt)
        setEndsAt(values.endsAt)
        setRows(values.rows)
        setSaved({ snapshot: snapshotOf(values), pricingKey: pricingKeyOf(values) })
        setPreview(null)
        setRefusedIds([])
    }

    useEffect(() => {
        if (!saleId) return
        let cancelled = false
        apiFetch(`/admin/sales/${saleId}`)
            .then(async (res) => {
                const body = await res.json().catch(() => ({}))
                if (cancelled) return
                if (!res.ok || !body?.data) throw new Error(errorMessage(body, "Couldn't load the sale"))
                applyDetail(body.data)
            })
            .catch((error) => {
                if (!cancelled) setLoadError(error instanceof Error ? error.message : "Couldn't load the sale")
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [saleId, loadAttempt])

    function retryLoad() {
        setLoadError(null)
        setIsLoading(true)
        setLoadAttempt((attempt) => attempt + 1)
    }

    // Closing or reloading the tab with unsaved changes asks first.
    useEffect(() => {
        if (!isDirty) return
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ""
        }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [isDirty])

    function confirmLeave(event: React.MouseEvent) {
        if (isDirty && !window.confirm("Leave without saving? Your changes to this sale will be lost.")) event.preventDefault()
    }

    // The other sales, to warn before two would run at once.
    const [otherSales, setOtherSales] = useState<OtherSale[]>([])
    useEffect(() => {
        let cancelled = false
        apiFetch("/admin/sales")
            .then(async (res) => {
                const body = await res.json()
                if (!cancelled && res.ok && Array.isArray(body.data)) setOtherSales(body.data)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [])

    // Only one sale runs at a time: a scheduled or live sale whose dates overlap these.
    const clash = useMemo(() => {
        const start = new Date(startsAt).getTime()
        const end = new Date(endsAt).getTime()
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null
        return otherSales.find((sale) =>
            sale.id !== saleId
            && (sale.status === "upcoming" || sale.status === "live")
            && new Date(sale.startsAt).getTime() < end
            && new Date(sale.endsAt).getTime() > start) || null
    }, [otherSales, saleId, startsAt, endsAt])
    const clashText = clash
        ? `Only one sale can run at a time. These dates overlap "${clash.name}" (${shortDate(clash.startsAt)} to ${shortDate(clash.endsAt)}). Change the dates, or end that sale first.`
        : null

    // Product search for "Add products".
    useEffect(() => {
        const text = query.trim()
        const id = ++searchId.current
        if (text.length < 2) return
        const timer = window.setTimeout(async () => {
            setIsSearching(true)
            try {
                const res = await apiFetch(`/admin/products?search=${encodeURIComponent(text)}&limit=8`)
                const body = await res.json()
                if (id === searchId.current) setOptions(Array.isArray(body.data) ? body.data : [])
            } catch {
                if (id === searchId.current) setOptions([])
            } finally {
                if (id === searchId.current) setIsSearching(false)
            }
        }, 300)
        return () => window.clearTimeout(timer)
    }, [query])

    const chosen = useMemo(() => new Set(rows.map((row) => row.productId)), [rows])

    function addProduct(product: ProductOption) {
        if (chosen.has(product._id)) return
        setRows((current) => [...current, {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            stock: product.stock,
            mrp: product.mrp ?? null,
            customerPercent: null,
            wholesalerPercent: null,
            saleQuantity: null,
            perPersonLimit: null,
            isNew: true,
        }])
    }

    function updateRow(index: number, patch: Partial<SaleProductRow>) {
        setRows((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)))
    }

    function moveRow(from: number, to: number) {
        setRows((current) => {
            if (to < 0 || to >= current.length) return current
            const next = [...current]
            const [row] = next.splice(from, 1)
            next.splice(to, 0, row)
            return next
        })
    }

    async function uploadHeroImage(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("image", file)
            // apiFetch refreshes an expired sign-in and leaves the multipart header to the browser.
            const res = await apiFetch("/upload/image?folder=sales", { method: "POST", body: formData })
            const body = await res.json().catch(() => ({}))
            if (!res.ok || !body.success) throw new Error(body?.message || "Upload failed")
            setHeroImageUrl(body.data.url)
            toast.success("Image uploaded")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed")
        } finally {
            setIsUploading(false)
        }
    }

    // The first thing wrong with the %s and quantities (they decide the prices).
    function findPricingProblem() {
        if (forCustomers && percentTextIsBad(customerPercent)) return "The customer % must be a whole number from 1 to 90"
        if (forWholesalers && percentTextIsBad(wholesalerPercent)) return "The wholesaler % must be a whole number from 1 to 90"
        if (forCustomers && !toPercent(customerPercent)) return "Enter the customer discount %"
        if (forWholesalers && !toPercent(wholesalerPercent)) return "Enter the wholesaler discount %"
        for (const row of rows) {
            const problem = rowProblem(row, forCustomers, forWholesalers)
            if (problem) return problem
        }
        return null
    }
    const pricingProblem = findPricingProblem()
    const datesAreValid = Boolean(startsAt && endsAt) && new Date(endsAt) > new Date(startsAt)

    function checkForm(nextStatus: "draft" | "published") {
        if (name.trim().length < 2) return "Enter the sale name"
        if (!startsAt || !endsAt) return "Choose when the sale starts and ends"
        if (!datesAreValid) return "The end must be after the start"
        if (pricingProblem) return pricingProblem
        if (nextStatus === "published" && rows.length === 0) return "Add at least one product before publishing"
        if (nextStatus === "published" && clashText) return clashText
        return null
    }

    function salePayload(nextStatus: "draft" | "published") {
        return {
            name: name.trim(),
            nameHindi: nameHindi.trim(),
            subtitle: subtitle.trim(),
            subtitleHindi: subtitleHindi.trim(),
            theme,
            heroImageUrl,
            audience,
            customerPercent: forCustomers ? toPercent(customerPercent) : null,
            wholesalerPercent: forWholesalers ? toPercent(wholesalerPercent) : null,
            startsAt: fromLocalInput(startsAt),
            endsAt: fromLocalInput(endsAt),
            status: nextStatus,
            products: rows.map((row) => ({
                productId: row.productId,
                customerPercent: forCustomers ? row.customerPercent : null,
                wholesalerPercent: forWholesalers ? row.wholesalerPercent : null,
                saleQuantity: row.saleQuantity,
                perPersonLimit: row.perPersonLimit,
            })),
        }
    }

    // Prices and warnings follow the %s and quantities as they are typed:
    // POST /admin/sales/preview once the inputs rest for a moment.
    const pricingKey = pricingKeyOf({ audience, customerPercent, wholesalerPercent, rows })
    const pricesAreSaved = pricingKey === saved.pricingKey
    const wantsPreview = !isEnded && rows.length > 0 && !pricesAreSaved && !pricingProblem && datesAreValid
    const previewBody = useRef("")
    useEffect(() => {
        previewBody.current = JSON.stringify({
            ...salePayload(isPublished ? "published" : "draft"),
            // Nothing is saved: a name typed later doesn't change the prices.
            name: name.trim().length >= 2 ? name.trim() : "Sale preview",
            ...(saleId ? { saleId } : {}),
        })
    })
    useEffect(() => {
        if (!wantsPreview) return
        const controller = new AbortController()
        const key = pricingKey
        const timer = window.setTimeout(async () => {
            try {
                const res = await apiFetch("/admin/sales/preview", { method: "POST", body: previewBody.current, signal: controller.signal })
                const body = await res.json().catch(() => ({}))
                if (controller.signal.aborted) return
                const products = body?.data?.products
                if (!res.ok || !Array.isArray(products)) {
                    const error = errorMessage(body, "Couldn't update the prices")
                    setPreview((current) => ({ key, rows: current?.rows ?? null, error, productIds: refusedProductIds(body) }))
                    return
                }
                const byId: Record<string, SaleProductRow> = {}
                for (const product of products) byId[String(product.productId)] = product
                setPreview({ key, rows: byId, error: null, productIds: [] })
            } catch {
                if (controller.signal.aborted) return
                setPreview((current) => ({ key, rows: current?.rows ?? null, error: "Couldn't update the prices", productIds: [] }))
            }
        }, 600)
        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [wantsPreview, pricingKey])

    const previewIsCurrent = preview?.key === pricingKey
    const previewPending = wantsPreview && !previewIsCurrent
    const previewError = wantsPreview && previewIsCurrent ? preview?.error || null : null
    const refused = new Set([...refusedIds, ...(previewError ? preview?.productIds || [] : [])])

    // A row's prices, warnings and sold count: as saved, or from the latest preview.
    function shownRow(row: SaleProductRow): SaleProductRow {
        if (pricesAreSaved) return row
        const fresh = preview?.rows?.[row.productId]
        if (!fresh) return row
        return {
            ...row,
            customer: fresh.customer,
            wholesaler: fresh.wholesaler,
            warnings: fresh.warnings,
            sold: fresh.sold ?? row.sold,
            remaining: fresh.remaining ?? null,
            missing: fresh.missing,
        }
    }

    async function save(nextStatus: "draft" | "published") {
        if (busy.current) return
        const problem = checkForm(nextStatus)
        if (problem) {
            toast.error(problem)
            return
        }
        busy.current = true
        setIsSaving(true)
        let leaving = false
        try {
            const res = await apiFetch(saleId ? `/admin/sales/${saleId}` : "/admin/sales", {
                method: saleId ? "PUT" : "POST",
                body: JSON.stringify(salePayload(nextStatus)),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) {
                setRefusedIds(refusedProductIds(body))
                throw new Error(errorMessage(body, "Couldn't save the sale", rows))
            }
            toast.success(nextStatus === "published" ? (isPublished ? "Sale saved" : "Sale published") : "Draft saved")
            if (!saleId) {
                // The form stays locked until the sale's own page opens, so
                // another click can't create a second sale.
                leaving = true
                setSaved((current) => ({ ...current, snapshot: snapshotOf(formValues) }))
                router.replace(`/sales/${body.data.id}`)
                return
            }
            applyDetail(body.data)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Couldn't save the sale")
        } finally {
            if (!leaving) {
                busy.current = false
                setIsSaving(false)
            }
        }
    }

    async function openAnnounce() {
        const request = ++announceRequest.current
        setAnnounceInfo(null)
        setAnnounceProblem(null)
        setNow(Date.now())
        setConfirm("announce")
        try {
            const res = await apiFetch(`/admin/sales/${saleId}/announce`)
            const body = await res.json().catch(() => ({}))
            if (request !== announceRequest.current || !res.ok || !body?.data) return
            const data = body.data
            setAnnounceInfo({
                recipients: typeof data.recipients === "number" ? data.recipients : null,
                canAnnounce: data.canAnnounce !== false,
                lastAt: data.lastAnnouncement?.at || null,
                lastSentTo: typeof data.lastAnnouncement?.sentTo === "number" ? data.lastAnnouncement.sentTo : null,
            })
            if (data.canAnnounce === false) setAnnounceProblem("You can announce the sale once it has started.")
        } catch {
            /* the dialog says "everyone in the audience" */
        }
    }

    async function runConfirmed() {
        if (!saleId || !confirm || busy.current) return
        busy.current = true
        setIsSaving(true)
        let leaving = false
        try {
            if (confirm === "delete") {
                const res = await apiFetch(`/admin/sales/${saleId}`, { method: "DELETE" })
                const body = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(errorMessage(body, "Couldn't delete the draft"))
                toast.success("Draft deleted")
                leaving = true
                router.replace("/sales")
                return
            }
            const res = await apiFetch(`/admin/sales/${saleId}/${confirm}`, { method: "POST" })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) {
                const code = body?.error?.code
                // Not started yet, or announced a few minutes ago: say so in the dialog.
                if (confirm === "announce" && (code === "SALE_RECENTLY_ANNOUNCED" || code === "SALE_NOT_LIVE")) {
                    setAnnounceProblem(errorMessage(body, "This sale can't be announced right now"))
                    return
                }
                throw new Error(errorMessage(body, "Something went wrong"))
            }
            if (confirm === "end") {
                applyDetail(body.data)
                toast.success("Sale ended")
            } else {
                toast.success(`Announced to ${body.data.sentTo} ${body.data.sentTo === 1 ? "person" : "people"}`)
                setDetail((current) => (current ? { ...current, lastAnnouncedAt: new Date().toISOString() } : current))
            }
            setConfirm(null)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong")
        } finally {
            if (!leaving) {
                busy.current = false
                setIsSaving(false)
            }
        }
    }

    const previewPercent = useMemo(() => {
        const base = forCustomers ? toPercent(customerPercent) : toPercent(wholesalerPercent)
        const own = rows.map((row) => (forCustomers ? row.customerPercent : row.wholesalerPercent))
        const all = [base, ...own].filter((value): value is number => value != null && isWholeIn(value, 1, 90))
        return all.length ? Math.max(...all) : null
    }, [rows, customerPercent, wholesalerPercent, forCustomers])

    const countdown = useMemo(() => {
        if (isEnded) return "Sale ended"
        if (startsAt && new Date(startsAt).getTime() > now) return `Starts in ${timeUntil(new Date(startsAt), now)}`
        return endsAt ? `Ends in ${timeUntil(new Date(endsAt), now)}` : ""
    }, [startsAt, endsAt, isEnded, now])

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
        )
    }

    // Never show an editable form for a sale that didn't load: saving it
    // would overwrite the real sale with blanks.
    if (saleId && !detail) {
        return (
            <div data-testid="sale-load-error" className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <div>
                    <p className="text-base font-semibold text-white">Couldn&apos;t load this sale</p>
                    <p className="text-sm text-[#919191]">{loadError || "Something went wrong"}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" onClick={retryLoad} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">
                        <RefreshCw className="mr-1 h-4 w-4" /> Retry
                    </Button>
                    <Link href="/sales">
                        <Button type="button" variant="outline" tabIndex={-1} className="border-[#333] bg-[#161616] text-gray-300 hover:bg-[#1A1A1A]">
                            Back to sales
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    const field = "h-10 w-full rounded-md border border-[#333] bg-[#161616] px-3 text-sm text-white disabled:opacity-60"
    const label = "mb-1 block text-xs font-medium text-[#919191]"
    const locked = isEnded || isSaving
    const lastAnnouncedAt = announceInfo?.lastAt || detail?.lastAnnouncedAt || null

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <Link href="/sales" aria-label="Back to sales" title="Back to sales" onClick={confirmLeave}>
                        <Button type="button" variant="outline" size="icon" tabIndex={-1} className="border-[#333] bg-[#161616] text-gray-400 hover:bg-[#1A1A1A]">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
                            {saleId ? (name || "Sale") : "New sale"}
                            {detail ? <SaleStatusChip status={status} /> : null}
                        </h1>
                        <p className="text-sm text-[#919191]">
                            {isEnded
                                ? "This sale has ended. Its prices no longer apply."
                                : "Prices apply in the app, cart and orders only between the start and end."}
                        </p>
                    </div>
                </div>
                {!isAdmin ? (
                    <p className="text-sm text-[#919191]">Only admins can change or announce sales.</p>
                ) : !isEnded ? (
                    <div className="flex flex-col gap-1 sm:items-end">
                        <div className="flex flex-wrap gap-2">
                            {isPublished ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isSaving || !isLive}
                                        title={isLive ? undefined : "You can announce once the sale starts"}
                                        onClick={() => void openAnnounce()}
                                        className="border-[#333] bg-[#161616] text-gray-300 hover:bg-[#1A1A1A]"
                                    >
                                        <Megaphone className="mr-1 h-4 w-4" /> Announce
                                    </Button>
                                    <Button type="button" variant="outline" disabled={isSaving} onClick={() => setConfirm("end")} className="border-red-500/40 bg-[#161616] text-red-400 hover:bg-red-500/10">
                                        End now
                                    </Button>
                                    <Button type="button" disabled={isSaving} onClick={() => void save("published")} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">
                                        {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save changes
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {saleId ? (
                                        <Button type="button" variant="outline" disabled={isSaving} onClick={() => setConfirm("delete")} className="border-red-500/40 bg-[#161616] text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="mr-1 h-4 w-4" /> Delete draft
                                        </Button>
                                    ) : null}
                                    <Button type="button" variant="outline" disabled={isSaving} onClick={() => void save("draft")} className="border-[#333] bg-[#161616] text-gray-300 hover:bg-[#1A1A1A]">
                                        Save draft
                                    </Button>
                                    <Button type="button" disabled={isSaving} onClick={() => void save("published")} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">
                                        {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Publish
                                    </Button>
                                </>
                            )}
                        </div>
                        {isPublished && !isLive ? (
                            <p data-testid="announce-hint" className="text-[11px] text-[#919191]">You can announce once the sale starts.</p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {detail && isPublished ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4" data-testid="sale-results">
                    <Tile label="Orders at sale prices" value={String(detail.results.orders)} />
                    <Tile label="Units sold" value={String(detail.results.units)} />
                    <Tile label="Revenue" value={rupees(detail.results.revenue)} />
                    <Tile label="Last announced" value={detail.lastAnnouncedAt ? dateTime(detail.lastAnnouncedAt) : "Not yet"} />
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                <section className="space-y-5 rounded-[28px] border border-[#333] bg-[#161616] p-5">
                    <div>
                        <p className={label}>Preview (top of the sale page in the app)</p>
                        <SaleHeaderPreview
                            theme={theme}
                            name={name}
                            subtitle={subtitle}
                            upToPercent={previewPercent}
                            countdown={countdown}
                            heroImage={heroImageUrl ? (heroImageUrl.startsWith("/") ? buildApiUrl(heroImageUrl).replace("/api/v1", "") : heroImageUrl) : undefined}
                        />
                    </div>

                    <fieldset disabled={locked} className="min-w-0 space-y-4">
                        <div>
                            <p className={label}>Look</p>
                            <div role="radiogroup" aria-label="Sale theme" className="grid grid-cols-2 gap-2">
                                {SALE_THEMES.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={theme === option.key}
                                        onClick={() => setTheme(option.key)}
                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${theme === option.key ? "border-2 border-blue-500 bg-sky-500/10/40" : "border-[#333] bg-[#161616] hover:border-[#444]"}`}
                                    >
                                        <span className="h-8 w-8 shrink-0 rounded-lg" style={{ backgroundImage: saleHeaderBackground(option), boxShadow: `inset 0 -6px 0 ${option.accent}` }} />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-white">{option.label}</span>
                                            <span className="block truncate text-[11px] text-[#919191]">{option.forWhat}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <label className={`inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#333] bg-[#161616] px-3 py-1.5 text-xs text-gray-300 ${isUploading ? "opacity-60" : "hover:bg-[#1A1A1A]"}`}>
                                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                                    {heroImageUrl ? "Change header image" : "Own header image (optional)"}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={isUploading} onChange={(event) => void uploadHeroImage(event)} />
                                </label>
                                {heroImageUrl ? (
                                    <button type="button" onClick={() => setHeroImageUrl("")} className="text-xs text-[#919191] hover:text-red-400">Remove image</button>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor="sale-name" className={label}>Sale name</label>
                                <Input id="sale-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Diwali Sale" className="border-[#333] bg-[#161616]" />
                            </div>
                            <div>
                                <label htmlFor="sale-name-hi" className={label}>Name in Hindi (optional)</label>
                                <Input id="sale-name-hi" value={nameHindi} maxLength={80} onChange={(event) => setNameHindi(event.target.value)} placeholder="दिवाली सेल" className="border-[#333] bg-[#161616]" />
                            </div>
                            <div>
                                <label htmlFor="sale-subtitle" className={label}>Subtitle (optional)</label>
                                <Input id="sale-subtitle" value={subtitle} maxLength={140} onChange={(event) => setSubtitle(event.target.value)} placeholder="Big savings on pumps and pipes" className="border-[#333] bg-[#161616]" />
                            </div>
                            <div>
                                <label htmlFor="sale-subtitle-hi" className={label}>Subtitle in Hindi (optional)</label>
                                <Input id="sale-subtitle-hi" value={subtitleHindi} maxLength={140} onChange={(event) => setSubtitleHindi(event.target.value)} placeholder="पंप और पाइप पर बड़ी बचत" className="border-[#333] bg-[#161616]" />
                            </div>
                            <div>
                                <label htmlFor="sale-starts" className={label}>Starts</label>
                                <input id="sale-starts" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={field} />
                            </div>
                            <div>
                                <label htmlFor="sale-ends" className={label}>Ends</label>
                                <input id="sale-ends" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={field} />
                            </div>
                            {clashText ? (
                                <p data-testid="sale-overlap" className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 sm:col-span-2 dark:bg-amber-500/15 dark:text-amber-300">
                                    {clashText}
                                </p>
                            ) : (
                                <p className="-mt-1 text-[11px] text-[#919191] sm:col-span-2">Only one sale runs at a time.</p>
                            )}
                            <div>
                                <label htmlFor="sale-audience" className={label}>Who gets the sale</label>
                                <select id="sale-audience" value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className={field}>
                                    <option value="customers">Customers</option>
                                    <option value="wholesalers">Wholesalers</option>
                                    <option value="both">Customers and wholesalers</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {forCustomers ? (
                                    <div>
                                        <label htmlFor="sale-customer-percent" className={label}>Customer % off MRP</label>
                                        <Input id="sale-customer-percent" type="number" min={1} max={90} step={1} aria-invalid={percentTextIsBad(customerPercent) || undefined} value={customerPercent} onChange={(event) => setCustomerPercent(event.target.value)} className={`bg-[#161616] ${percentTextIsBad(customerPercent) ? "border-red-400" : "border-[#333]"}`} />
                                    </div>
                                ) : null}
                                {forWholesalers ? (
                                    <div>
                                        <label htmlFor="sale-wholesaler-percent" className={label}>Wholesaler % off MRP</label>
                                        <Input id="sale-wholesaler-percent" type="number" min={1} max={90} step={1} aria-invalid={percentTextIsBad(wholesalerPercent) || undefined} value={wholesalerPercent} onChange={(event) => setWholesalerPercent(event.target.value)} className={`bg-[#161616] ${percentTextIsBad(wholesalerPercent) ? "border-red-400" : "border-[#333]"}`} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <p className="text-xs text-[#919191]">
                            The sale price is used only when it&apos;s lower than the normal price (including brand and category discounts).
                        </p>
                    </fieldset>
                </section>

                <section className="rounded-[28px] border border-[#333] bg-[#161616] p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-white">Products ({rows.length})</h2>
                        {previewPending ? (
                            <span data-testid="sale-price-status" className="flex items-center gap-1 text-xs text-[#919191]">
                                <Loader2 className="h-3 w-3 animate-spin" /> Updating prices
                            </span>
                        ) : previewError ? (
                            <span data-testid="sale-price-status" className="text-xs text-[#919191]">Prices not updated: {previewError}</span>
                        ) : null}
                    </div>
                    {rows.length > 0 && pricingProblem && !isEnded ? (
                        <p data-testid="sale-pricing-problem" className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300 dark:bg-amber-500/15 dark:text-amber-300">
                            {pricingProblem}
                        </p>
                    ) : null}

                    <fieldset disabled={locked} className="min-w-0">
                        {!isEnded ? (
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#919191]" />
                                <Input
                                    aria-label="Search products to add"
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value)
                                        if (event.target.value.trim().length < 2) setOptions([])
                                    }}
                                    placeholder="Search products to add (name or SKU)"
                                    className="border-[#333] bg-[#161616] pl-10"
                                />
                                {query.trim().length >= 2 ? (
                                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[#333] bg-[#161616] shadow-lg" data-testid="sale-product-options">
                                        {isSearching ? (
                                            <p className="flex items-center gap-2 px-3 py-3 text-sm text-[#919191]"><Loader2 className="h-4 w-4 animate-spin" /> Searching</p>
                                        ) : options.length === 0 ? (
                                            <p className="px-3 py-3 text-sm text-[#919191]">No products found</p>
                                        ) : options.map((product) => (
                                            <button
                                                key={product._id}
                                                type="button"
                                                disabled={chosen.has(product._id)}
                                                onClick={() => addProduct(product)}
                                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#1A1A1A] disabled:opacity-50"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium text-white">{product.name}</span>
                                                    <span className="block text-xs text-[#919191]">{product.sku || "—"} · Stock {product.stock ?? 0}</span>
                                                </span>
                                                <span className="shrink-0 text-xs font-medium text-sky-300">{chosen.has(product._id) ? "Added" : <><Plus className="mr-0.5 inline h-3.5 w-3.5" />Add</>}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#333] py-12 text-center text-[#919191]">
                                <Package className="mb-2 h-8 w-8 opacity-50" />
                                <p className="text-sm">Search above to add the products in this sale</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {rows.map((row, index) => {
                                    const shown = shownRow(row)
                                    const isRefused = refused.has(row.productId) || Boolean(shown.missing)
                                    // A product that no longer exists comes back without a name.
                                    const rowName = row.name || "Product"
                                    return (
                                        <li
                                            key={row.productId}
                                            data-testid="sale-product-row"
                                            data-refused={isRefused || undefined}
                                            className={`rounded-xl border p-3 ${isRefused ? "border-red-500/40 bg-red-500/10 dark:border-red-500/60 dark:bg-red-500/10" : "border-[#333] bg-[#161616]"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">{rowName}</p>
                                                    <p className="text-xs text-[#919191]">{row.sku || "—"} · Stock {row.stock ?? 0} · MRP {rupees(row.mrp)}</p>
                                                </div>
                                                {!isEnded ? (
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        <IconButton label={`Move ${rowName} up`} disabled={index === 0} onClick={() => moveRow(index, index - 1)}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                                                        <IconButton label={`Move ${rowName} down`} disabled={index === rows.length - 1} onClick={() => moveRow(index, index + 1)}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                                                        <IconButton label={`Remove ${rowName}`} onClick={() => setRows((current) => current.filter((_, position) => position !== index))}><X className="h-3.5 w-3.5" /></IconButton>
                                                    </div>
                                                ) : null}
                                            </div>
                                            {isRefused ? (
                                                <p data-testid="sale-product-refused" className="mt-2 flex items-center gap-1 text-xs font-medium text-red-300 dark:text-red-300">
                                                    <AlertTriangle className="h-3.5 w-3.5" /> Archived or no longer exists. Remove it from the sale to save.
                                                </p>
                                            ) : null}
                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy={previewPending || undefined}>
                                                {forCustomers ? (
                                                    <PriceCell
                                                        title="Customer"
                                                        info={shown.customer}
                                                        stale={previewPending}
                                                        percent={row.customerPercent}
                                                        disabled={isEnded}
                                                        onPercent={(value) => updateRow(index, { customerPercent: value })}
                                                        fallback={toPercent(customerPercent)}
                                                        label={`${rowName} customer %`}
                                                    />
                                                ) : null}
                                                {forWholesalers ? (
                                                    <PriceCell
                                                        title="Wholesaler"
                                                        info={shown.wholesaler}
                                                        stale={previewPending}
                                                        percent={row.wholesalerPercent}
                                                        disabled={isEnded}
                                                        onPercent={(value) => updateRow(index, { wholesalerPercent: value })}
                                                        fallback={toPercent(wholesalerPercent)}
                                                        label={`${rowName} wholesaler %`}
                                                    />
                                                ) : null}
                                                <div>
                                                    <label className="block text-[11px] text-[#919191]" htmlFor={`qty-${row.productId}`}>Sale quantity</label>
                                                    <input
                                                        id={`qty-${row.productId}`}
                                                        type="number"
                                                        min={1}
                                                        step={1}
                                                        placeholder="No limit"
                                                        disabled={isEnded}
                                                        aria-invalid={badCount(row.saleQuantity, MAX_SALE_QUANTITY) || undefined}
                                                        value={row.saleQuantity ?? ""}
                                                        onChange={(event) => updateRow(index, { saleQuantity: toNumberOrNull(event.target.value) })}
                                                        className={`h-8 w-full rounded-md border bg-[#161616] px-2 text-sm text-white ${badCount(row.saleQuantity, MAX_SALE_QUANTITY) ? "border-red-400" : "border-[#333]"}`}
                                                    />
                                                    {row.saleQuantity != null && !row.isNew && isPublished ? (
                                                        <p className="mt-0.5 text-[11px] text-[#919191]" data-testid="sale-sold">
                                                            Sold {shown.sold ?? 0} of {row.saleQuantity}{shown.remaining === 0 ? " · sold out" : ""}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-[#919191]" htmlFor={`limit-${row.productId}`}>Max per person</label>
                                                    <input
                                                        id={`limit-${row.productId}`}
                                                        type="number"
                                                        min={1}
                                                        step={1}
                                                        placeholder="No limit"
                                                        disabled={isEnded}
                                                        aria-invalid={badCount(row.perPersonLimit, MAX_PER_PERSON) || undefined}
                                                        value={row.perPersonLimit ?? ""}
                                                        onChange={(event) => updateRow(index, { perPersonLimit: toNumberOrNull(event.target.value) })}
                                                        className={`h-8 w-full rounded-md border bg-[#161616] px-2 text-sm text-white ${badCount(row.perPersonLimit, MAX_PER_PERSON) ? "border-red-400" : "border-[#333]"}`}
                                                    />
                                                </div>
                                            </div>
                                            {shown.warnings?.length ? (
                                                <div className="mt-2 flex flex-wrap gap-1" data-testid="sale-product-warnings">
                                                    {shown.warnings.map((warning) => (
                                                        <span key={warning.code} className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300 dark:bg-amber-500/15 dark:text-amber-300">
                                                            <AlertTriangle className="h-3 w-3" /> {warning.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </fieldset>
                </section>
            </div>

            <AlertDialog open={confirm !== null} onOpenChange={(open) => { if (!open && !isSaving) setConfirm(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirm === "end" ? `End ${name} now?` : confirm === "delete" ? "Delete this draft?" : `Announce ${name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === "end"
                                ? "Sale prices stop at once, and its banner and Home strip disappear. Orders already placed keep their prices."
                                : confirm === "delete"
                                    ? "The draft and its product list are removed."
                                    : `Sends "${name} is live" to ${announceInfo?.recipients == null ? "everyone in the sale's audience" : `${announceInfo.recipients} ${announceInfo.recipients === 1 ? "person" : "people"}`} as a push notification and in their notification list, in their app language. Tapping it opens the sale page.`}
                        </AlertDialogDescription>
                        {confirm === "announce" ? (
                            <p data-testid="sale-last-announced" className="text-sm text-[#919191]">
                                {lastAnnouncedAt
                                    ? `Last announced ${dateTime(lastAnnouncedAt)} (${ago(lastAnnouncedAt, now)})${announceInfo?.lastSentTo != null ? ` to ${announceInfo.lastSentTo} ${announceInfo.lastSentTo === 1 ? "person" : "people"}` : ""}.`
                                    : "Not announced yet."}
                            </p>
                        ) : null}
                        {confirm === "announce" && announceProblem ? (
                            <p role="alert" data-testid="sale-announce-problem" className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300 dark:bg-amber-500/15 dark:text-amber-300">
                                {announceProblem}
                            </p>
                        ) : null}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSaving || (confirm === "announce" && (Boolean(announceProblem) || announceInfo?.canAnnounce === false))}
                            className={confirm === "announce" ? "bg-[#86efac] text-black hover:bg-[#86efac]/90" : "bg-red-600 text-white hover:bg-red-700"}
                            onClick={(event) => { event.preventDefault(); void runConfirmed() }}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : confirm === "end" ? "End now" : confirm === "delete" ? "Delete draft" : "Announce"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function Tile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[#333] bg-[#161616] px-4 py-3">
            <p className="text-xs text-[#919191]">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#333] text-[#919191] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-40"
        >
            {children}
        </button>
    )
}

function PriceCell({
    title,
    info,
    stale,
    percent,
    fallback,
    disabled,
    onPercent,
    label,
}: {
    title: string
    info?: PriceInfo
    // A newer price is on its way.
    stale?: boolean
    percent: number | null
    fallback: number | null
    disabled?: boolean
    onPercent: (value: number | null) => void
    label: string
}) {
    const invalid = badPercent(percent)
    return (
        <div>
            <p className="text-[11px] text-[#919191]">{title}</p>
            {!info ? (
                <p className="text-sm text-[#919191]">Save to see</p>
            ) : info.salePrice ? (
                <p className={`text-sm font-semibold text-white ${stale ? "opacity-50" : ""}`}>
                    {rupees(info.salePrice)} <span className="text-xs font-normal text-[#919191] line-through">{rupees(info.normalPrice)}</span>
                </p>
            ) : (
                <p className={`text-sm text-[#919191] ${stale ? "opacity-50" : ""}`}>{rupees(info.normalPrice)} <span className="text-[11px]">(no saving)</span></p>
            )}
            <div className="mt-1 flex items-center gap-1">
                <input
                    aria-label={label}
                    aria-invalid={invalid || undefined}
                    type="number"
                    min={1}
                    max={90}
                    step={1}
                    disabled={disabled}
                    placeholder={fallback ? `${fallback}` : "%"}
                    value={percent ?? ""}
                    onChange={(event) => onPercent(toNumberOrNull(event.target.value))}
                    className={`h-7 w-16 rounded-md border px-2 text-xs text-white ${invalid ? "border-red-400 bg-[#161616]" : percent != null ? "border-amber-400 bg-amber-500/10" : "border-[#333] bg-[#161616]"}`}
                />
                <span className="text-[11px] text-[#919191]">% {percent != null ? "(own)" : "(sale's)"}</span>
            </div>
        </div>
    )
}

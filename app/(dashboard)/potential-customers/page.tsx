"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, UserSearch, Phone, Mail, Package, ChevronLeft, ChevronRight, ChevronDown, Clock, MessageCircle, Timer, CheckCircle2, Undo2, Flame, Search, Users, X, Check } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { fetchAllCategories, type CategoryOption } from "@/lib/categories"

type InterestLevel = "Hot" | "Warm" | "Browsing"

interface LeadUser {
    name: string
    email?: string
    phone?: string
    role?: string
    businessName?: string
    city?: string
}

interface LeadProduct {
    name: string
    sku?: string
    slug?: string
    price: number
    image?: string
}

interface LeadContactInfo {
    lastContactAt: string
    lastContactByName?: string
    contactCount?: number
}

/** One person + one product (the Products view). */
interface PotentialCustomer {
    userId: string
    productId: string
    viewCount: number
    lastViewed: string
    // Seconds spent on the product page (reported by the app).
    watchSeconds?: number
    // When and by whom the lead was messaged.
    contact?: LeadContactInfo
    isContacted?: boolean
    interest?: InterestLevel
    user: LeadUser
    product: LeadProduct
}

/** One person with every product they looked at (the People view). */
interface LeadPerson {
    userId: string
    user: LeadUser
    productCount: number
    viewCount: number
    watchSeconds: number
    lastViewed: string
    contactedCount: number
    lastContactAt?: string
    interest: InterestLevel
    products: Omit<PotentialCustomer, "userId" | "user">[]
}

interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
}

interface Brand {
    _id: string
    name: string
}

type Mode = "people" | "products"

// Product links in messages open the product on the website (or the app).
const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.veepeeimpex.com").replace(/\/$/, "")
// A combined message names this many products, then "and N more".
const PRODUCTS_IN_MESSAGE = 3

/** A person's products as single leads (for messages and Contacted). */
function personLeads(person: LeadPerson): PotentialCustomer[] {
    return person.products.map((item) => ({ ...item, userId: person.userId, user: person.user }))
}

export default function PotentialCustomersPage() {
    const [mode, setMode] = useState<Mode>("people")
    const [people, setPeople] = useState<LeadPerson[]>([])
    const [leads, setLeads] = useState<PotentialCustomer[]>([])
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    // Filters: when the product was last viewed, how many views, and the order.
    const [lastViewed, setLastViewed] = useState("7d")
    const [customFrom, setCustomFrom] = useState("")
    const [customTo, setCustomTo] = useState("")
    const [minViews, setMinViews] = useState("1")
    const [minProducts, setMinProducts] = useState("1")
    const [sort, setSort] = useState("recent")
    const [role, setRole] = useState("")
    const [interest, setInterest] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [companyId, setCompanyId] = useState("")
    // Typed filters wait a moment before searching.
    const [searchInput, setSearchInput] = useState("")
    const [productInput, setProductInput] = useState("")
    const [search, setSearch] = useState("")
    const [productText, setProductText] = useState("")
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    // "To contact" or "Contacted" (already messaged by the team).
    const [view, setView] = useState<"todo" | "contacted">("todo")
    const [counts, setCounts] = useState({ todo: 0, contacted: 0 })
    const [summary, setSummary] = useState({ people: 0, hotPeople: 0, products: 0 })
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, pages: 0 })
    // Messaging everyone, one chat per click (browsers block many tabs at once).
    const [queue, setQueue] = useState<{ items: (LeadPerson | PotentialCustomer)[]; index: number; sent: number } | null>(null)
    const [scheduleTime, setScheduleTime] = useState("")
    const [scheduledAt, setScheduledAt] = useState<Date | null>(null)
    const scheduleTimeoutRef = useRef<number | null>(null)
    // Only the latest request updates the list.
    const requestRef = useRef(0)

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch(searchInput.trim())
            setProductText(productInput.trim())
        }, 350)
        return () => window.clearTimeout(timer)
    }, [searchInput, productInput])

    useEffect(() => {
        fetchAllCategories().then(setCategories).catch(() => setCategories([]))
        loadBrands().then(setBrands).catch(() => setBrands([]))
        return () => {
            if (scheduleTimeoutRef.current) window.clearTimeout(scheduleTimeoutRef.current)
        }
    }, [])

    useEffect(() => {
        // A custom range waits until both dates are chosen.
        if (lastViewed === "custom" && (!customFrom || !customTo)) return
        setQueue(null)
        fetchLeads(1)
    }, [mode, lastViewed, customFrom, customTo, minViews, minProducts, sort, role, interest, categoryId, companyId, search, productText, view])

    async function loadBrands(): Promise<Brand[]> {
        const all: Brand[] = []
        for (let page = 1; page <= 20; page++) {
            const res = await apiFetch(`/companies?page=${page}&limit=50`, { skipAuth: true })
            if (!res.ok) break
            const payload = await res.json()
            all.push(...(Array.isArray(payload.data) ? payload.data : []))
            if (page >= (Number(payload.pagination?.totalPages) || 1)) break
        }
        return all
    }

    /** The query for the chosen filters (times in this browser's time zone). */
    function filterQuery() {
        const params = new URLSearchParams({ minViews, sort, view })
        if (mode === "people") {
            params.set("groupBy", "person")
            params.set("minProducts", minProducts)
        }
        if (role) params.set("role", role)
        if (interest) params.set("interest", interest)
        if (categoryId) params.set("categoryId", categoryId)
        if (companyId) params.set("companyId", companyId)
        if (search) params.set("search", search)
        if (productText) params.set("product", productText)
        const startOfDay = (offsetDays: number) => {
            const day = new Date()
            day.setHours(0, 0, 0, 0)
            day.setDate(day.getDate() - offsetDays)
            return day
        }
        if (lastViewed === "today") {
            params.set("period", "7d")
            params.set("lastViewedFrom", startOfDay(0).toISOString())
        } else if (lastViewed === "yesterday") {
            params.set("period", "7d")
            params.set("lastViewedFrom", startOfDay(1).toISOString())
            params.set("lastViewedTo", startOfDay(0).toISOString())
        } else if (lastViewed === "custom") {
            params.set("period", "30d")
            params.set("lastViewedFrom", new Date(`${customFrom}T00:00:00`).toISOString())
            params.set("lastViewedTo", new Date(`${customTo}T23:59:59.999`).toISOString())
        } else {
            params.set("period", lastViewed)
        }
        return params.toString()
    }

    async function fetchLeads(page: number) {
        const request = ++requestRef.current
        setIsLoading(true)
        try {
            const res = await apiFetch(`/admin/analytics/potential-customers?${filterQuery()}&page=${page}&limit=30`)
            const data = await res.json()
            if (request !== requestRef.current) return
            if (res.ok && data.success) {
                setPeople(data.data.people || [])
                setLeads(data.data.potentialCustomers || [])
                setPagination(data.data.pagination)
                if (data.data.counts) setCounts(data.data.counts)
                if (data.data.summary) setSummary(data.data.summary)
            } else {
                toast.error("Failed to fetch potential customers")
            }
        } catch (error) {
            if (request !== requestRef.current) return
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            if (request === requestRef.current) setIsLoading(false)
        }
    }

    function changeMode(next: Mode) {
        if (next === mode) return
        setMode(next)
        setSort(next === "people" ? "recent" : "views")
        setExpanded(new Set())
    }

    function toggleExpanded(userId: string) {
        setExpanded((current) => {
            const next = new Set(current)
            if (next.has(userId)) next.delete(userId)
            else next.add(userId)
            return next
        })
    }

    function clearFilters() {
        setSearchInput("")
        setProductInput("")
        setRole("")
        setInterest("")
        setCategoryId("")
        setCompanyId("")
        setMinViews("1")
        setMinProducts("1")
        setLastViewed("7d")
    }

    const hasFilters = !!(searchInput || productInput || role || interest || categoryId || companyId || minViews !== "1" || minProducts !== "1" || lastViewed !== "7d")

    /** e.g. "19 Oct 2026, 12:56 pm" in India time. */
    function exactTime(dateStr: string) {
        return new Date(dateStr).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
        })
    }

    function formatPrice(price: number) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)
    }

    // Like Laxmi Agro: repeat views or time spent on the page.
    function getInterestLevel(lead: { interest?: InterestLevel; viewCount: number; watchSeconds?: number }): InterestLevel {
        if (lead.interest) return lead.interest
        const seconds = lead.watchSeconds || 0
        if (lead.viewCount >= 5 || seconds >= 120) return "Hot"
        if (lead.viewCount >= 3 || seconds >= 45) return "Warm"
        return "Browsing"
    }

    /** "45s", "2m 30s", "1h 5m"; "—" when nothing was reported. */
    function formatWatch(seconds?: number) {
        const total = Math.round(seconds || 0)
        if (total <= 0) return "—"
        if (total < 60) return `${total}s`
        const minutes = Math.floor(total / 60)
        if (minutes < 60) return `${minutes}m${total % 60 ? ` ${total % 60}s` : ""}`
        return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    }

    /** The team messaged these leads: they move to "Contacted". */
    async function markContacted(list: PotentialCustomer[], quiet = false) {
        if (list.length === 0) return
        try {
            const res = await apiFetch('/admin/analytics/potential-customers/contacted', {
                method: 'POST',
                body: JSON.stringify({ leads: list.map((lead) => ({ userId: lead.userId, productId: lead.productId })) }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.message || "Could not mark as contacted")
            if (!quiet) toast.success(data.message || "Moved to Contacted")
            if (!quiet) fetchLeads(pagination.page)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not mark as contacted")
        }
    }

    async function undoContacted(lead: { userId: string; productId: string }) {
        try {
            const res = await apiFetch('/admin/analytics/potential-customers/contacted', {
                method: 'DELETE',
                body: JSON.stringify({ userId: lead.userId, productId: lead.productId }),
            })
            if (!res.ok) throw new Error()
            toast.success("Moved back to To contact")
            fetchLeads(pagination.page)
        } catch {
            toast.error("Could not undo")
        }
    }

    function formatWhatsappNumber(phone?: string): string | null {
        const digits = (phone || "").replace(/\D/g, "")
        if (!digits) return null
        if (digits.length === 10) return `91${digits}`
        return digits
    }

    function productLink(product: LeadProduct) {
        return product.slug ? `${PUBLIC_SITE}/products/${product.slug}` : ""
    }

    function buildLeadMessage(lead: PotentialCustomer): string {
        const greetingName = lead.user.name || "there"
        const link = productLink(lead.product)
        const linkLine = link ? `\n\n${link}` : ""
        const interestLevel = getInterestLevel(lead)
        if (interestLevel === "Hot") {
            return `Hi ${greetingName}, we noticed your strong interest in ${lead.product.name}. It's currently available at ${formatPrice(lead.product.price)}. I can help you place an order now and share the best deal.${linkLine}`
        }
        if (interestLevel === "Warm") {
            return `Hi ${greetingName}, thanks for checking ${lead.product.name}. It's available at ${formatPrice(lead.product.price)}. Let me know if you want specs, delivery timeline, or a quote.${linkLine}`
        }
        return `Hi ${greetingName}, sharing details for ${lead.product.name} (${formatPrice(lead.product.price)}). If you are comparing options, I can help with features, stock, and pricing.${linkLine}`
    }

    /** One message for everything a person looked at: the top 3, then "and N more". */
    function buildPersonMessage(person: LeadPerson): string {
        const list = personLeads(person)
        if (list.length === 1) return buildLeadMessage(list[0])
        const greetingName = person.user.name || "there"
        const shown = list.slice(0, PRODUCTS_IN_MESSAGE).map(({ product }) => {
            const link = productLink(product)
            return `• ${product.name} – ${formatPrice(product.price)}${link ? `\n  ${link}` : ""}`
        })
        const more = list.length - shown.length
        return [
            `Hi ${greetingName}, thanks for checking out these products on OXON:`,
            "",
            ...shown,
            ...(more > 0 ? [`…and ${more} more.`] : []),
            "",
            "I can help with prices, stock and delivery. Shall I share the best quote for you?",
        ].join("\n")
    }

    function whatsappUrl(phone: string | undefined, message: string): string | null {
        const number = formatWhatsappNumber(phone)
        return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null
    }

    function isPerson(item: LeadPerson | PotentialCustomer): item is LeadPerson {
        return "products" in item
    }

    /** Opens the chat and moves what it covers to Contacted. */
    function messageItem(item: LeadPerson | PotentialCustomer, quiet = false): boolean {
        const url = whatsappUrl(item.user.phone, isPerson(item) ? buildPersonMessage(item) : buildLeadMessage(item))
        if (!url) {
            toast.error(`${item.user.name || "This customer"} has no valid phone number`)
            return false
        }
        window.open(url, "_blank", "noopener,noreferrer")
        void markContacted(isPerson(item) ? personLeads(item) : [item], quiet)
        return true
    }

    /** Message everyone on this page, one chat per click. */
    function startQueue() {
        const items = (mode === "people" ? people : leads).filter((item) => !!formatWhatsappNumber(item.user.phone))
        if (items.length === 0) {
            toast.error("No leads with a valid phone number on this page")
            return
        }
        setQueue({ items, index: 0, sent: 0 })
    }

    function queueSend() {
        if (!queue) return
        const sent = messageItem(queue.items[queue.index], true) ? queue.sent + 1 : queue.sent
        queueAdvance(sent)
    }

    function queueAdvance(sent = queue?.sent ?? 0) {
        if (!queue) return
        if (queue.index + 1 >= queue.items.length) {
            setQueue(null)
            toast.success(`Messaged ${sent} of ${queue.items.length}`)
            fetchLeads(1)
            return
        }
        setQueue({ ...queue, index: queue.index + 1, sent })
    }

    function stopQueue() {
        const sent = queue?.sent ?? 0
        setQueue(null)
        if (sent > 0) fetchLeads(1)
    }

    // At the chosen time the step-by-step messaging starts (a browser only
    // opens WhatsApp after a click).
    function scheduleMessageToAll() {
        if (!scheduleTime) {
            toast.error("Please select date and time")
            return
        }
        const targetTime = new Date(scheduleTime)
        if (Number.isNaN(targetTime.getTime())) {
            toast.error("Invalid date/time selected")
            return
        }
        const delay = targetTime.getTime() - Date.now()
        if (delay <= 0) {
            toast.error("Please select a future time")
            return
        }
        if (scheduleTimeoutRef.current) window.clearTimeout(scheduleTimeoutRef.current)
        scheduleTimeoutRef.current = window.setTimeout(() => {
            scheduleTimeoutRef.current = null
            setScheduledAt(null)
            startQueue()
            toast.info("Time to message your leads: click Send for each one.", { duration: 10000 })
        }, delay)
        setScheduledAt(targetTime)
        toast.success(`Reminder set for ${targetTime.toLocaleString()}. Keep this tab open.`)
    }

    function cancelScheduledMessage() {
        if (!scheduleTimeoutRef.current) return
        window.clearTimeout(scheduleTimeoutRef.current)
        scheduleTimeoutRef.current = null
        setScheduledAt(null)
        toast.success("Scheduled messages cancelled")
    }

    const lastViewedOptions = [
        { value: "today", label: "Last viewed: Today" },
        { value: "yesterday", label: "Last viewed: Yesterday" },
        { value: "3d", label: "Last viewed: Last 3 days" },
        { value: "7d", label: "Last viewed: Last 7 days" },
        { value: "14d", label: "Last viewed: Last 14 days" },
        { value: "30d", label: "Last viewed: Last 30 days" },
        { value: "custom", label: "Last viewed: Custom dates" },
    ]
    const viewOptions = [
        { value: "1", label: "Views: Any" },
        { value: "2", label: "Views: 2+" },
        { value: "3", label: "Views: 3+" },
        { value: "5", label: "Views: 5+" },
        { value: "10", label: "Views: 10+" },
    ]
    const productCountOptions = [
        { value: "1", label: "Products: Any" },
        { value: "2", label: "Products: 2+" },
        { value: "3", label: "Products: 3+" },
        { value: "5", label: "Products: 5+" },
    ]
    const sortOptions = mode === "people"
        ? [
            { value: "recent", label: "Sort: Most recent" },
            { value: "products", label: "Sort: Most products" },
            { value: "views", label: "Sort: Most views" },
            { value: "watch", label: "Sort: Most watch time" },
        ]
        : [
            { value: "views", label: "Sort: Most views" },
            { value: "recent", label: "Sort: Most recent" },
            { value: "watch", label: "Sort: Most watch time" },
        ]
    const selectClass = "bg-[#161616] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#86efac] cursor-pointer"
    const inputClass = "bg-[#161616] border border-[#333] text-white text-sm rounded-lg pl-9 pr-3 py-2 w-full focus:outline-none focus:border-[#86efac] placeholder:text-[#666]"
    const today = new Date().toLocaleDateString("en-CA")
    const rows = mode === "people" ? people : leads
    const queueItem = queue ? queue.items[queue.index] : null

    const interestBadge = (level: InterestLevel) => level === "Hot" ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-500/10"><Flame className="h-3 w-3" />Hot</span>
    ) : level === "Warm" ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium text-orange-400 bg-orange-500/10">Warm</span>
    ) : (
        <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-400 bg-blue-500/10">Browsing</span>
    )

    const productThumb = (product: LeadProduct, size = "w-10 h-10") => product.image ? (
        <img src={product.image} alt={product.name} className={`${size} rounded-md object-contain bg-white border border-[#333]`} />
    ) : (
        <div className={`${size} rounded-md bg-[#1A1A1A] flex items-center justify-center border border-[#333]`}>
            <Package className="h-4 w-4 text-gray-500" />
        </div>
    )

    const customerCell = (user: LeadUser) => (
        <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-white">{user.name}</p>
                {user.role === "wholesaler" ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-purple-300 bg-purple-500/15">Wholesaler</span>
                ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-500/15">Buyer</span>
                )}
            </div>
            {(user.businessName || user.city) && (
                <p className="text-xs text-[#919191]">{[user.businessName, user.city].filter(Boolean).join(" · ")}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {user.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>
                )}
                {!user.phone && user.email && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                )}
            </div>
        </div>
    )

    /** Contacted time and who, with Undo; or Message + Mark contacted. */
    const leadActions = (lead: PotentialCustomer) => lead.isContacted || (view === "contacted" && lead.contact) ? (
        <div className="flex flex-col items-end gap-1.5">
            {lead.contact && (
                <span className="inline-flex items-start gap-1 text-xs text-[#86efac] text-right">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-px shrink-0" />
                    <span>
                        <span className="block whitespace-nowrap">{exactTime(lead.contact.lastContactAt)}</span>
                        {lead.contact.lastContactByName && <span className="block text-[#919191]">by {lead.contact.lastContactByName}</span>}
                    </span>
                </span>
            )}
            <div className="flex gap-1">
                <Button size="sm" variant="ghost" title="Move back to To contact" className="h-7 px-2 text-xs text-gray-300 hover:bg-[#333]" onClick={() => undoContacted(lead)}>
                    <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                </Button>
                <Button size="sm" variant="outline" title="Message again" className="h-7 px-2 text-xs border-[#86efac] text-[#86efac] hover:bg-[#86efac]/10" onClick={() => messageItem(lead)}>
                    <MessageCircle className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    ) : (
        <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" title="Mark as contacted (e.g. after a call)" className="h-8 px-2 text-gray-300 hover:bg-[#333]" onClick={() => markContacted([lead])}>
                <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8 bg-[#86efac] text-black hover:bg-[#86efac]/90" onClick={() => messageItem(lead)}>
                <MessageCircle className="h-4 w-4 mr-1" />
                Message
            </Button>
        </div>
    )

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Potential Customers</h1>
                    <p className="text-sm text-[#919191] mt-1">
                        Users who viewed products but didn&apos;t add to cart or purchase within 5 minutes
                    </p>
                </div>
                <div className="flex rounded-lg border border-[#333] p-0.5 self-start" role="tablist" aria-label="Group leads">
                    {([
                        { value: "people", label: "People", icon: Users },
                        { value: "products", label: "Products", icon: Package },
                    ] as const).map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={mode === tab.value}
                            onClick={() => changeMode(tab.value)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${mode === tab.value ? "bg-[#86efac] text-black" : "text-gray-300 hover:bg-[#222]"}`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#0D0D0D] rounded-2xl p-4 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                    <div className="relative">
                        <Search className="h-4 w-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input aria-label="Search people" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name, phone or business" className={inputClass} />
                    </div>
                    <div className="relative">
                        <Package className="h-4 w-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input aria-label="Product viewed" value={productInput} onChange={(e) => setProductInput(e.target.value)} placeholder="Viewed product: name or SKU" className={inputClass} />
                    </div>
                    <select aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
                        <option value="">Category: All</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category._id}>{category.name}</option>
                        ))}
                    </select>
                    <select aria-label="Brand" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={selectClass}>
                        <option value="">Brand: All</option>
                        {brands.map((brand) => (
                            <option key={brand._id} value={brand._id}>{brand.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Last viewed" value={lastViewed} onChange={(e) => setLastViewed(e.target.value)} className={selectClass}>
                        {lastViewedOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {lastViewed === "custom" && (
                        <>
                            <input
                                type="date"
                                aria-label="Last viewed from"
                                value={customFrom}
                                max={customTo || today}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className={selectClass}
                            />
                            <span className="text-sm text-[#919191]">to</span>
                            <input
                                type="date"
                                aria-label="Last viewed to"
                                value={customTo}
                                min={customFrom || undefined}
                                max={today}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className={selectClass}
                            />
                        </>
                    )}
                    <select aria-label="Customer type" value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
                        <option value="">Type: All</option>
                        <option value="buyer">Type: Buyer</option>
                        <option value="wholesaler">Type: Wholesaler</option>
                    </select>
                    <select aria-label="Interest" value={interest} onChange={(e) => setInterest(e.target.value)} className={selectClass}>
                        <option value="">Interest: All</option>
                        <option value="hot">Interest: Hot</option>
                        <option value="warm">Interest: Warm</option>
                        <option value="high">Interest: Hot + Warm</option>
                    </select>
                    <select aria-label="Number of views" value={minViews} onChange={(e) => setMinViews(e.target.value)} className={selectClass}>
                        {viewOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {mode === "people" && (
                        <select aria-label="Products viewed" value={minProducts} onChange={(e) => setMinProducts(e.target.value)} className={selectClass}>
                            {productCountOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    )}
                    <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
                        {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    {hasFilters && (
                        <Button size="sm" variant="ghost" className="text-gray-300 hover:bg-[#333]" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" /> Clear filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0D0D0D] rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-orange-500/10">
                        <UserSearch className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white">{summary.people}</p>
                        <p className="text-xs text-[#919191]">{view === "contacted" ? "People contacted" : "People to contact"}</p>
                    </div>
                </div>
                <div className="bg-[#0D0D0D] rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-red-500/10">
                        <Flame className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white">{summary.hotPeople}</p>
                        <p className="text-xs text-[#919191]">Hot people</p>
                    </div>
                </div>
                <div className="bg-[#0D0D0D] rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10">
                        <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white">{summary.products}</p>
                        <p className="text-xs text-[#919191]">Products with interest</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#161616] border border-[#333] rounded-2xl">
                <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-semibold text-white">{mode === "people" ? "People" : "Lead Details"}</h2>
                        <div className="flex rounded-lg border border-[#333] p-0.5" role="tablist" aria-label="Lead status">
                            {([
                                { value: "todo", label: "To contact" },
                                { value: "contacted", label: "Contacted" },
                            ] as const).map((tab) => (
                                <button
                                    key={tab.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={view === tab.value}
                                    onClick={() => setView(tab.value)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === tab.value ? "bg-[#86efac] text-black" : "text-gray-300 hover:bg-[#222]"}`}
                                >
                                    {tab.label} <span className="opacity-70">({counts[tab.value]})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {view === "todo" && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            <input
                                type="datetime-local"
                                aria-label="Message time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="bg-[#0D0D0D] border border-[#333] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#86efac]"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-[#86efac] text-[#86efac] hover:bg-[#86efac]/10"
                                onClick={scheduleMessageToAll}
                                disabled={isLoading || rows.length === 0}
                            >
                                Schedule All
                            </Button>
                            {scheduledAt && (
                                <Button size="sm" variant="ghost" className="text-white hover:bg-[#333]" onClick={cancelScheduledMessage}>
                                    Cancel Schedule
                                </Button>
                            )}
                            <Button
                                size="sm"
                                className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                                onClick={startQueue}
                                disabled={isLoading || rows.length === 0 || !!queue}
                            >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Message All
                            </Button>
                        </div>
                    )}
                </div>
                {scheduledAt && (
                    <div className="px-6 py-2 border-b border-[#333] text-xs text-[#86efac]">
                        Messages start at {scheduledAt.toLocaleString()}: keep this tab open, then click Send for each person.
                    </div>
                )}
                {queue && queueItem && (
                    <div className="px-6 py-3 border-b border-[#333] bg-[#86efac]/5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-sm text-white">
                            <span className="text-[#86efac] font-semibold">{queue.index + 1} of {queue.items.length}</span>
                            {" · "}
                            <span className="font-medium">{queueItem.user.name}</span>
                            <span className="text-[#919191]">
                                {" · "}
                                {isPerson(queueItem)
                                    ? `${queueItem.productCount} ${queueItem.productCount === 1 ? "product" : "products"}`
                                    : queueItem.product.name}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="text-gray-300 hover:bg-[#333]" onClick={stopQueue}>Stop</Button>
                            <Button size="sm" variant="outline" className="border-[#333] text-gray-300 hover:bg-[#333]" onClick={() => queueAdvance()}>Skip</Button>
                            <Button size="sm" className="bg-[#86efac] text-black hover:bg-[#86efac]/90" onClick={queueSend}>
                                <MessageCircle className="h-4 w-4 mr-1" /> Send &amp; next
                            </Button>
                        </div>
                    </div>
                )}
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="text-center py-16">
                            <UserSearch className="h-12 w-12 mx-auto mb-3 text-[#333]" />
                            <p className="font-medium text-gray-400">{view === "contacted" ? "No contacted leads yet" : "No potential customers found"}</p>
                            <p className="text-sm text-[#919191] mt-1">
                                {hasFilters
                                    ? "Try clearing some filters."
                                    : view === "contacted"
                                        ? "Leads you message move here, so nobody is messaged twice."
                                        : "All viewers have converted or the window hasn't elapsed yet"}
                            </p>
                        </div>
                    ) : (
                        <>
                            {mode === "people" ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                            <TableHead className="w-8" />
                                            <TableHead className="text-gray-400">Customer</TableHead>
                                            <TableHead className="text-gray-400">Products viewed</TableHead>
                                            <TableHead className="text-gray-400 text-center">Views</TableHead>
                                            <TableHead className="text-gray-400 text-center">Watch</TableHead>
                                            <TableHead className="text-gray-400">Last Active</TableHead>
                                            <TableHead className="text-gray-400">Interest</TableHead>
                                            <TableHead className="text-gray-400">Contacted</TableHead>
                                            <TableHead className="text-gray-400 text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {people.map((person) => {
                                            const open = expanded.has(person.userId)
                                            const toContact = personLeads(person).filter((lead) => !lead.isContacted)
                                            return (
                                                <Fragment key={person.userId}>
                                                    <TableRow
                                                        className={`border-[#333] cursor-pointer ${open ? "bg-[#1A1A1A] hover:bg-[#1A1A1A]" : "hover:bg-[#1A1A1A]"}`}
                                                        onClick={() => toggleExpanded(person.userId)}
                                                        aria-expanded={open}
                                                    >
                                                        <TableCell className="pr-0">
                                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`} />
                                                        </TableCell>
                                                        <TableCell>{customerCell(person.user)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex -space-x-3">
                                                                    {person.products.slice(0, 3).map((item) => (
                                                                        <div key={item.productId} className="rounded-md ring-2 ring-[#161616]">
                                                                            {productThumb(item.product, "w-9 h-9")}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-white">{person.productCount} {person.productCount === 1 ? "product" : "products"}</p>
                                                                    <p className="text-xs text-[#919191] line-clamp-1 max-w-[150px]">{person.products[0]?.product.name}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-semibold text-sm text-white">{person.viewCount}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-300 whitespace-nowrap">
                                                                {person.watchSeconds > 0 && <Timer className="h-3 w-3 text-[#86efac]" />}
                                                                {formatWatch(person.watchSeconds)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-start gap-1 text-xs text-gray-400">
                                                                <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                                                                <span>{exactTime(person.lastViewed).split(/, (?=\d+:)/).map((part, index) => <span key={index} className="block whitespace-nowrap">{part}</span>)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{interestBadge(person.interest)}</TableCell>
                                                        <TableCell>
                                                            <span className={`text-xs font-semibold whitespace-nowrap ${person.contactedCount === person.productCount ? "text-[#86efac]" : person.contactedCount > 0 ? "text-yellow-400" : "text-gray-400"}`}>
                                                                {person.contactedCount} of {person.productCount}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex justify-end gap-2">
                                                                {person.user.phone && (
                                                                    <Button asChild size="sm" variant="outline" className="h-8 border-[#333] text-gray-200 hover:bg-[#333]">
                                                                        <a href={`tel:${person.user.phone}`} title={`Call ${person.user.phone}`}>
                                                                            <Phone className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                                {toContact.length > 0 && (
                                                                    <Button size="sm" variant="ghost" title="Mark all as contacted (e.g. after a call)" className="h-8 px-2 text-gray-300 hover:bg-[#333]" onClick={() => markContacted(toContact)}>
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                <Button size="sm" className="h-8 bg-[#86efac] text-black hover:bg-[#86efac]/90" onClick={() => messageItem(person)}>
                                                                    <MessageCircle className="h-4 w-4 mr-1" />
                                                                    {view === "contacted" ? "Message again" : "WhatsApp"}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {open && (
                                                        <TableRow className="border-[#333] bg-[#111] hover:bg-[#111]">
                                                            <TableCell colSpan={9} className="p-0">
                                                                <div className="px-6 py-4 pl-14">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                                                                                <TableHead className="text-gray-500 text-xs">Product</TableHead>
                                                                                <TableHead className="text-gray-500 text-xs text-center">Views</TableHead>
                                                                                <TableHead className="text-gray-500 text-xs text-center">Watch</TableHead>
                                                                                <TableHead className="text-gray-500 text-xs">Last Viewed</TableHead>
                                                                                <TableHead className="text-gray-500 text-xs">Interest</TableHead>
                                                                                <TableHead className="text-gray-500 text-xs text-right" />
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {personLeads(person).map((lead) => (
                                                                                <TableRow key={lead.productId} className="border-[#2a2a2a] hover:bg-[#1A1A1A]">
                                                                                    <TableCell>
                                                                                        <div className="flex items-center gap-3">
                                                                                            {productThumb(lead.product)}
                                                                                            <div>
                                                                                                <p className="text-sm font-medium text-white line-clamp-2 max-w-[220px] whitespace-normal">{lead.product.name}</p>
                                                                                                <p className="text-xs text-[#919191]">{formatPrice(lead.product.price)}{lead.product.sku ? ` · ${lead.product.sku}` : ""}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-center text-sm font-semibold text-white">{lead.viewCount}</TableCell>
                                                                                    <TableCell className="text-center text-xs font-semibold text-gray-300 whitespace-nowrap">{formatWatch(lead.watchSeconds)}</TableCell>
                                                                                    <TableCell className="text-xs text-gray-400 whitespace-nowrap">{exactTime(lead.lastViewed)}</TableCell>
                                                                                    <TableCell>{interestBadge(getInterestLevel(lead))}</TableCell>
                                                                                    <TableCell className="text-right">{leadActions(lead)}</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                            <TableHead className="text-gray-400">Customer</TableHead>
                                            <TableHead className="text-gray-400">Product Viewed</TableHead>
                                            <TableHead className="text-gray-400 text-center">Views</TableHead>
                                            <TableHead className="text-gray-400 text-center">Watch Time</TableHead>
                                            <TableHead className="text-gray-400">Last Viewed</TableHead>
                                            <TableHead className="text-gray-400">Interest</TableHead>
                                            <TableHead className="text-gray-400 text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leads.map((lead, i) => (
                                            <TableRow key={`${lead.userId}-${lead.productId}-${i}`} className="border-[#333] hover:bg-[#1A1A1A]">
                                                <TableCell>{customerCell(lead.user)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {productThumb(lead.product)}
                                                        <div>
                                                            <p className="text-sm font-medium text-white line-clamp-2 max-w-[220px] whitespace-normal">{lead.product.name}</p>
                                                            <p className="text-xs text-[#919191]">{formatPrice(lead.product.price)}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-semibold text-sm text-white">{lead.viewCount}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-300 whitespace-nowrap">
                                                        {(lead.watchSeconds || 0) > 0 && <Timer className="h-3 w-3 text-[#86efac]" />}
                                                        {formatWatch(lead.watchSeconds)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                                                        <Clock className="h-3 w-3" />
                                                        {exactTime(lead.lastViewed)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{interestBadge(getInterestLevel(lead))}</TableCell>
                                                <TableCell className="text-right">{leadActions(lead)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#333]">
                                    <p className="text-sm text-[#919191]">
                                        Page {pagination.page} of {pagination.pages} ({pagination.total} {mode === "people" ? "people" : "leads"})
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-[#333]"
                                            disabled={pagination.page <= 1}
                                            onClick={() => fetchLeads(pagination.page - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-[#333]"
                                            disabled={pagination.page >= pagination.pages}
                                            onClick={() => fetchLeads(pagination.page + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

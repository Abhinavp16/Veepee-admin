"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, Download, Loader2, Send, ShoppingCart, Heart, Sparkles, User, Users, Store, Ticket, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { ItemPicker, NotificationPictureField, notificationImage, type ImageMode, type NotificationLinkTarget } from "@/components/notification-link"
import { PhonePreview } from "@/components/custom-notification/phone-preview"
import { SavedMessagesMenu } from "@/components/custom-notification/saved-messages"
import { apiFetch } from "@/lib/api"
import {
    audienceLabels,
    audienceRole,
    audienceSummary,
    guestOnlyPages,
    guestPages,
    guestWelcome,
    installedLabels,
    pageKeys,
    pageLabels,
    pageRoles,
    roleWords,
    segmentLabels,
    type Audience,
    type InstalledWithin,
    type NotificationTemplate,
    type PageKey,
    type Role,
    type Segment,
    type StoredLink,
} from "@/lib/custom-notifications"

// Customers → Custom notification → New: numbered sections (who, message,
// what tapping opens, extras), a phone preview and a confirm step.

export type LinkChoice = "none" | "product" | "category" | "sale" | PageKey

/** Everything the form holds; "Send again" and saved messages load one. */
export interface NotificationDraft {
    audience?: Audience
    segment?: Segment
    installedWithinDays?: InstalledWithin
    savedProduct?: NotificationLinkTarget | null
    title?: string
    body?: string
    titleHi?: string
    bodyHi?: string
    choice?: LinkChoice
    target?: NotificationLinkTarget | null
    imageMode?: ImageMode
    customImage?: string
    couponCode?: string
}

/** A stored link (template or history) as form state. */
export function draftLink(link: StoredLink | null | undefined, imageUrl?: string): NotificationDraft {
    const picture: NotificationDraft = imageUrl ? { imageMode: "custom", customImage: imageUrl } : { imageMode: "none", customImage: "" }
    if (!link) return { choice: "none", target: null, ...picture }
    if (link.type === "page") return { choice: link.page || "none", target: null, ...picture }
    return {
        choice: link.type,
        target: link.id ? { type: link.type, id: link.id, name: link.name || "", image: "" } : null,
        ...picture,
    }
}

interface Offer {
    _id: string
    code?: string
    title: string
    targetGroup: "buyer" | "wholesaler" | "all"
    isActive: boolean
    startDate?: string
    endDate?: string | null
    usageLimit?: number
    usageCount?: number
}

const section = "rounded-xl border border-[#333] bg-[#0D0D0D] p-4 space-y-3"
const sectionTitle = "text-sm font-bold text-white flex items-center gap-2"
const stepBadge = "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#86efac]/15 text-[#86efac] text-xs font-black"
const chip = (active: boolean) =>
    `h-9 px-3 rounded-full text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50 ${active ? "bg-[#86efac] text-black border-[#86efac]" : "border-[#333] text-gray-300 hover:text-white hover:bg-white/5"}`

const TITLE_LOCK_SCREEN = 50
// The server takes up to this many chosen people; more: send to a group.
const MAX_CHOSEN = 2000

/** A new id for one send, so a retry is never sent twice. */
const newSendId = () => {
    try {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
    } catch { /* below */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
const roleSegment: Record<Role, Segment> = { buyer: "buyers", wholesaler: "wholesalers" }

const audienceCards: { key: Audience; icon: React.ElementType; hint: string; isNew?: boolean }[] = [
    { key: "selected", icon: User, hint: "People ticked in the list below" },
    { key: "buyers", icon: Users, hint: "Every customer account" },
    { key: "wholesalers", icon: Store, hint: "Every wholesaler account" },
    { key: "cart", icon: ShoppingCart, hint: "Have something in their cart", isNew: true },
    { key: "saved", icon: Heart, hint: "Saved a product to their wishlist", isNew: true },
    { key: "guests", icon: Download, hint: "Phones with the app that never made an account", isNew: true },
]

const linkChoices: LinkChoice[] = ["none", "product", "category", "sale", ...pageKeys]
const choiceLabel = (choice: LinkChoice) =>
    choice === "none" ? "Just the message" : choice === "product" ? "Product" : choice === "category" ? "Category" : choice === "sale" ? "Sale page" : pageLabels[choice]
const isPage = (choice: LinkChoice): choice is PageKey => (pageKeys as string[]).includes(choice)
/** A page that needs an account (not for phones that aren't signed in). */
const needsAccount = (choice: LinkChoice) => isPage(choice) && !guestPages.includes(choice)
const isGuestOnly = (choice: LinkChoice) => isPage(choice) && guestOnlyPages.includes(choice)

type TextField = "title" | "body" | "titleHi" | "bodyHi"

export function NotificationComposer({ selectedIds, onSent, draft, draftKey, onClearSelection }: {
    selectedIds: string[]
    onSent: () => void
    onClearSelection?: () => void
    /** Loaded into the form whenever draftKey changes. */
    draft?: NotificationDraft | null
    draftKey?: number
}) {
    const [audience, setAudience] = useState<Audience>("selected")
    const [segment, setSegment] = useState<Segment>("all")
    const [installedWithin, setInstalledWithin] = useState<InstalledWithin>(null)
    const [savedProduct, setSavedProduct] = useState<NotificationLinkTarget | null>(null)
    const [text, setText] = useState<Record<TextField, string>>({ title: "", body: "", titleHi: "", bodyHi: "" })
    const [showHindi, setShowHindi] = useState(false)
    const [choice, setChoice] = useState<LinkChoice>("none")
    const [target, setTarget] = useState<NotificationLinkTarget | null>(null)
    const [imageMode, setImageMode] = useState<ImageMode>("none")
    const [customImage, setCustomImage] = useState("")
    const [couponCode, setCouponCode] = useState("")
    const [offers, setOffers] = useState<Offer[] | null>(null)
    const [count, setCount] = useState<{ people: number; phones: number; skipped: number; hindi?: number } | null>(null)
    const [isCounting, setIsCounting] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const refs = {
        title: useRef<HTMLInputElement>(null),
        body: useRef<HTMLTextAreaElement>(null),
        titleHi: useRef<HTMLInputElement>(null),
        bodyHi: useRef<HTMLTextAreaElement>(null),
    }
    const lastField = useRef<TextField>("body")

    const groupRole = audienceRole(audience, segment)
    const linkTarget = choice === "product" || choice === "category" || choice === "sale" ? (target?.type === choice ? target : null) : null
    // A customers-only or wholesalers-only page or sale.
    const pageRole: Role | null = isPage(choice) ? pageRoles[choice] || null : choice === "sale" ? linkTarget?.role ?? null : null
    const linkName = choice === "sale" && linkTarget ? `The sale ${linkTarget.name}` : choiceLabel(choice)
    const sendImage = notificationImage(linkTarget, imageMode, customImage)
    const hasHindi = Boolean(text.titleHi.trim() || text.bodyHi.trim())
    const toGuests = audience === "guests"
    const usesName = /\{\s*name\s*\}/i.test(text.title + text.body + text.titleHi + text.bodyHi)

    // "Send again" / a saved message.
    useEffect(() => {
        if (!draft) return
        if (draft.audience) setAudience(draft.audience)
        if (draft.segment) setSegment(draft.segment)
        if (draft.installedWithinDays !== undefined) setInstalledWithin(draft.installedWithinDays)
        if (draft.savedProduct !== undefined) setSavedProduct(draft.savedProduct)
        setText((t) => ({
            title: draft.title ?? t.title,
            body: draft.body ?? t.body,
            titleHi: draft.titleHi ?? t.titleHi,
            bodyHi: draft.bodyHi ?? t.bodyHi,
        }))
        if (draft.titleHi || draft.bodyHi) setShowHindi(true)
        if (draft.choice) setChoice(draft.choice)
        if (draft.target !== undefined) setTarget(draft.target)
        if (draft.imageMode) setImageMode(draft.imageMode)
        if (draft.customImage !== undefined) setCustomImage(draft.customImage)
        if (draft.couponCode !== undefined) setCouponCode(draft.couponCode)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey])

    // Active coupons with a code.
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const all: Offer[] = []
                for (let page = 1; page <= 5; page += 1) {
                    const res = await apiFetch(`/admin/offers?isActive=true&limit=50&page=${page}`)
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) break
                    all.push(...(Array.isArray(data.data) ? data.data : []))
                    if (page >= (Number(data.pagination?.totalPages) || 1)) break
                }
                const now = Date.now()
                const active = all.filter((offer) => offer.code && offer.isActive
                    && (!offer.startDate || new Date(offer.startDate).getTime() <= now)
                    && (!offer.endDate || new Date(offer.endDate).getTime() >= now)
                    && !(offer.usageLimit && (offer.usageCount || 0) >= offer.usageLimit))
                if (!cancelled) setOffers(active)
            } catch {
                if (!cancelled) setOffers([])
            }
        })()
        return () => { cancelled = true }
    }, [])

    // How many people it reaches (debounced).
    const countLink = isPage(choice) ? { type: "page", page: choice } : choice === "sale" && linkTarget ? { type: "sale", id: linkTarget.id } : null
    const countKey = JSON.stringify([audience, segment, installedWithin, savedProduct?.id, audience === "selected" ? selectedIds : null, countLink])
    useEffect(() => {
        // A new question: the old answer is never shown for it.
        setCount(null)
        setIsCounting(false)
        if ((audience === "selected" && (selectedIds.length === 0 || selectedIds.length > MAX_CHOSEN)) || (audience === "saved" && !savedProduct)) return
        let cancelled = false
        setIsCounting(true)
        const timer = setTimeout(async () => {
            try {
                const res = await apiFetch("/admin/customers/notifications/count", {
                    method: "POST",
                    body: JSON.stringify({ ...audienceBody(), link: countLink }),
                })
                const data = await res.json().catch(() => ({}))
                if (!cancelled) setCount(res.ok && data.data ? data.data : null)
            } catch {
                if (!cancelled) setCount(null)
            } finally {
                if (!cancelled) setIsCounting(false)
            }
        }, 400)
        return () => {
            cancelled = true
            clearTimeout(timer)
            setIsCounting(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countKey])

    function audienceBody() {
        if (audience === "selected") return { userIds: selectedIds }
        if (audience === "cart") return { audience, segment }
        if (audience === "saved") return { audience, segment, productId: savedProduct?.id }
        if (audience === "guests") return { audience, installedWithinDays: installedWithin }
        return { audience }
    }

    // A customers-only or wholesalers-only page rules out the other group.
    function audienceBlocked(key: Audience): string | null {
        // A sale only for wholesalers can't go to phones that aren't signed in.
        if (key === "guests" && pageRole === "wholesaler") return `${linkName} is only for wholesalers`
        if (!pageRole) return null
        if ((key === "buyers" && pageRole === "wholesaler") || (key === "wholesalers" && pageRole === "buyer")) {
            return `${linkName} is only for ${roleWords[pageRole]}`
        }
        return null
    }

    function segmentBlocked(key: Segment): string | null {
        if (!pageRole) return null
        return key === roleSegment[pageRole] ? null : `${linkName} is only for ${roleWords[pageRole]}`
    }

    function chooseAudience(key: Audience) {
        setAudience(key)
        // Pages that need an account (or Create account, for accounts) aren't offered.
        if ((key === "guests" && needsAccount(choice)) || (key !== "guests" && isGuestOnly(choice))) {
            setChoice("none")
            toast.message(key === "guests"
                ? `${pageLabels[choice as PageKey]} needs an account, so tapping now opens the message`
                : "Create account is only for phones that aren't signed in, so tapping now opens the message")
        }
        if ((key === "cart" || key === "saved") && pageRole) setSegment(roleSegment[pageRole])
    }

    function choiceBlocked(next: LinkChoice): string | null {
        if (toGuests && needsAccount(next)) return "Needs an account"
        const role = isPage(next) ? pageRoles[next] : undefined
        if (!role) return null
        if ((audience === "buyers" || audience === "wholesalers") && groupRole !== role) return `Only for ${roleWords[role]}`
        return null
    }

    function chooseLink(next: LinkChoice) {
        setChoice(next)
        if (!(next === "product" || next === "category" || next === "sale") || target?.type !== next) {
            setTarget(null)
            if (imageMode === "linked") setImageMode("none")
        }
        const role = isPage(next) ? pageRoles[next] : undefined
        if (role && (audience === "cart" || audience === "saved")) setSegment(roleSegment[role])
    }

    function pickTarget(next: NotificationLinkTarget | null) {
        setTarget(next)
        if (next?.role && (audience === "cart" || audience === "saved")) setSegment(roleSegment[next.role])
        if (!next) {
            if (imageMode === "linked") setImageMode("none")
        } else if (imageMode !== "custom") {
            // Its photo (a sale's banner), unless another picture was chosen.
            setImageMode(next.image ? "linked" : "none")
        }
    }

    // A sale only for the other group can't go to All customers / All wholesalers.
    function saleBlocked(sale: NotificationLinkTarget): string | null {
        if (!sale.role) return null
        if ((audience === "buyers" || audience === "wholesalers" || audience === "guests") && groupRole !== sale.role) return `Only for ${roleWords[sale.role]}`
        return null
    }

    function couponBlocked(offer: Offer): string | null {
        if (offer.targetGroup === "all") return null
        const words = roleWords[offer.targetGroup]
        if (audience === "selected") return null
        if (groupRole === null) return `Only for ${words}: choose ${segmentLabels[roleSegment[offer.targetGroup]]} in the filter`
        if (groupRole !== offer.targetGroup) return `Only for ${words}`
        return null
    }
    const chosenOffer = offers?.find((offer) => offer.code === couponCode) || null
    const couponProblem = couponCode && chosenOffer ? couponBlocked(chosenOffer) : null

    function setField(field: TextField, value: string) {
        setText((t) => ({ ...t, [field]: value }))
    }

    // Puts {name} where the cursor was in the last field used.
    function insertName() {
        const field = lastField.current
        if ((field === "titleHi" || field === "bodyHi") && !showHindi) lastField.current = "body"
        const name = lastField.current
        const el = refs[name].current
        const value = text[name]
        const start = el?.selectionStart ?? value.length
        const end = el?.selectionEnd ?? value.length
        const next = value.slice(0, start) + "{name}" + value.slice(end)
        const max = name === "title" || name === "titleHi" ? 100 : 500
        if (next.length > max) {
            toast.error("No room for {name} in that box")
            return
        }
        setField(name, next)
        requestAnimationFrame(() => {
            el?.focus()
            el?.setSelectionRange(start + 6, start + 6)
        })
    }

    const textProps = (field: TextField) => ({
        value: text[field],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(field, e.target.value),
        onFocus: () => { lastField.current = field },
    })

    function problems(): string | null {
        if (audience === "selected" && selectedIds.length === 0) return "Tick the people to send it to in the list below, or choose a group."
        if (audience === "selected" && selectedIds.length > MAX_CHOSEN) return `Up to ${MAX_CHOSEN} chosen people at a time. Send to a group (All customers, All wholesalers) instead.`
        if (audience === "saved" && !savedProduct) return "Pick the product people saved."
        if (!text.title.trim() || !text.body.trim()) return "Write a title and a message."
        if (Boolean(text.titleHi.trim()) !== Boolean(text.bodyHi.trim())) return "Fill in both the Hindi title and message, or leave both empty."
        if ((choice === "product" || choice === "category" || choice === "sale") && !linkTarget) return `Pick the ${choice === "sale" ? "sale" : choice} it opens.`
        if (couponProblem) return `Coupon ${couponCode}: ${couponProblem.toLowerCase()}.`
        if (toGuests && needsAccount(choice)) return `${pageLabels[choice as PageKey]} needs an account. Pick another page.`
        if (toGuests && count && count.phones === 0) return "No phone that isn't signed in can get this yet. Phones join once they have the new app version and allow notifications."
        if (count && count.people === 0) return "Nobody would get this. Change who it goes to."
        if (!count) return isCounting ? "Counting who gets it…" : "Couldn't count who gets it yet."
        return null
    }
    const problem = problems()

    function linkPayload() {
        if (choice === "none") return null
        if (isPage(choice)) return { type: "page", page: choice }
        return linkTarget ? { type: linkTarget.type, id: linkTarget.id } : null
    }

    function storedLink(): StoredLink | null {
        if (choice === "none") return null
        if (isPage(choice)) return { type: "page", page: choice }
        return linkTarget ? { type: linkTarget.type, id: linkTarget.id, name: linkTarget.name } : null
    }

    function reset() {
        setText({ title: "", body: "", titleHi: "", bodyHi: "" })
        setShowHindi(false)
        setChoice("none")
        setTarget(null)
        setImageMode("none")
        setCustomImage("")
        setCouponCode("")
        setAudience("selected")
        setSegment("all")
        setInstalledWithin(null)
        setSavedProduct(null)
    }

    function sendPayload() {
        return {
            ...audienceBody(),
            title: text.title.trim(),
            body: text.body.trim(),
            ...(hasHindi && { titleHi: text.titleHi.trim(), bodyHi: text.bodyHi.trim() }),
            link: linkPayload(),
            couponCode: couponCode || null,
            imageUrl: sendImage,
        }
    }

    // One id per message as it stands: retrying the same confirm (after a
    // timeout, say) reuses it, so the server never sends it twice; any edit,
    // or a successful send, makes a new one.
    const payloadKey = JSON.stringify(sendPayload())
    const [sendId, setSendId] = useState(newSendId)
    useEffect(() => {
        setSendId(newSendId())
    }, [payloadKey])

    async function send() {
        setIsSending(true)
        try {
            const res = await apiFetch("/admin/customers/notifications", {
                method: "POST",
                body: JSON.stringify({ ...sendPayload(), sendId }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.status === 409) {
                // Already sent by an earlier try: don't send it again.
                toast.error(data.message || "This notification was already sent")
                setConfirmOpen(false)
                setSendId(newSendId())
                return
            }
            if (!res.ok) throw new Error(data.message || "Failed to send notification")
            if (data.data?.failed > 0) toast.warning(data.message || "Saved, but some pushes failed")
            else toast.success(data.message || "Notification sent")
            setConfirmOpen(false)
            reset()
            setSendId(newSendId())
            onSent()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error connecting to server")
        } finally {
            setIsSending(false)
        }
    }

    function loadTemplate(template: NotificationTemplate) {
        setText({ title: template.title || "", body: template.body || "", titleHi: template.titleHi || "", bodyHi: template.bodyHi || "" })
        setShowHindi(Boolean(template.titleHi || template.bodyHi))
        const linkState = draftLink(template.link, template.imageUrl)
        // "Sale is live (pick the sale)": open the sale picker.
        const choiceNext = !template.link && /pick the sale/i.test(template.name) ? "sale" : linkState.choice || "none"
        setChoice(choiceNext)
        setTarget(linkState.target ?? null)
        setImageMode(linkState.imageMode || "none")
        setCustomImage(linkState.customImage || "")
        const role = isPage(choiceNext) ? pageRoles[choiceNext] : undefined
        let switched = ""
        if (isGuestOnly(choiceNext) && audience !== "guests") {
            setAudience("guests")
            switched = `Send to switched to ${audienceLabels.guests}`
        } else if (audience === "guests" && needsAccount(choiceNext)) {
            const next: Audience = role === "wholesaler" ? "wholesalers" : "buyers"
            setAudience(next)
            switched = `${pageLabels[choiceNext as PageKey]} needs an account: Send to switched to ${audienceLabels[next]}`
        } else if (role) {
            if ((audience === "cart" || audience === "saved") && segment !== roleSegment[role]) {
                setSegment(roleSegment[role])
                switched = `"Who among them" switched to ${segmentLabels[roleSegment[role]]}`
            } else if ((audience === "buyers" || audience === "wholesalers") && groupRole !== role) {
                const next: Audience = role === "buyer" ? "buyers" : "wholesalers"
                setAudience(next)
                switched = `Send to switched to ${audienceLabels[next]}`
            }
        }
        const parts = [`Loaded "${template.name}"`]
        if (switched) parts.push(switched)
        if (choiceNext === "sale" && !linkState.target) parts.push("pick the sale in step 3")
        toast.success(parts.join(" · "), switched ? { duration: 6000 } : undefined)
    }

    const currentTemplate = (): Omit<NotificationTemplate, "name"> => ({
        title: text.title,
        body: text.body,
        titleHi: text.titleHi,
        bodyHi: text.bodyHi,
        link: storedLink(),
        imageUrl: imageMode === "custom" ? customImage : "",
    })

    // Only a count for exactly this audience (stale ones are cleared).
    const peopleText = count
        ? toGuests
            ? `${count.phones.toLocaleString("en-IN")} ${count.phones === 1 ? "phone" : "phones"}`
            : `${count.people.toLocaleString("en-IN")} ${count.people === 1 ? "person" : "people"}`
        : toGuests ? "these phones" : "these people"
    const opensText = useMemo(() => {
        if (choice === "none") return toGuests ? "the app (these phones have no inbox, so the text is only in the notification)" : "the full message in the app"
        if (isPage(choice)) return `${pageLabels[choice]} in the app`
        if (linkTarget) return `${choice === "sale" ? "the sale" : `the ${choice}`} ${linkTarget.name}`
        return `a ${choice === "sale" ? "sale" : choice} (not picked yet)`
    }, [choice, linkTarget, toGuests])

    const titleLength = text.title.length

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <SavedMessagesMenu onLoad={loadTemplate} current={currentTemplate} canSave={Boolean(text.title.trim() || text.body.trim())} />
                {problem && <p className="text-xs text-gray-500">{problem}</p>}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
                <div className="space-y-4 min-w-0">
                    {/* 1 · Send to */}
                    <section className={section} aria-labelledby="cn-step-1">
                        <h3 id="cn-step-1" className={sectionTitle}><span className={stepBadge} aria-hidden="true">1</span>Send to</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" role="radiogroup" aria-labelledby="cn-step-1">
                            {audienceCards.map(({ key, icon: Icon, hint, isNew }) => {
                                const blocked = audienceBlocked(key)
                                const active = audience === key
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        disabled={Boolean(blocked)}
                                        onClick={() => chooseAudience(key)}
                                        className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50 ${active ? "border-[#86efac] bg-[#86efac]/10" : "border-[#333] hover:bg-white/5"}`}
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold text-white">
                                            <Icon className={`w-4 h-4 ${active ? "text-[#86efac]" : "text-gray-400"}`} aria-hidden="true" />
                                            {audienceLabels[key]}
                                            {key === "selected" && <span className="text-gray-400 font-normal">({selectedIds.length})</span>}
                                            {isNew && <span className="whats-new-pill">New</span>}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-gray-500">{blocked || hint}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {audience === "selected" && selectedIds.length > 0 && onClearSelection && (
                            <button type="button" onClick={onClearSelection} className="text-xs text-gray-400 hover:text-white underline underline-offset-2">Clear the {selectedIds.length} ticked</button>
                        )}

                        {(audience === "cart" || audience === "saved") && (
                            <div className="space-y-1.5">
                                <span id="cn-segment" className="text-xs font-semibold text-gray-300">Who among them</span>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cn-segment">
                                    {(Object.keys(segmentLabels) as Segment[]).map((key) => {
                                        const blocked = segmentBlocked(key)
                                        return (
                                            <button key={key} type="button" role="radio" aria-checked={segment === key} disabled={Boolean(blocked)} title={blocked || undefined} onClick={() => setSegment(key)} className={chip(segment === key)}>
                                                {segmentLabels[key]}
                                            </button>
                                        )
                                    })}
                                </div>
                                {pageRole && <p className="text-[11px] text-gray-500">{linkName} is only for {roleWords[pageRole]}.</p>}
                            </div>
                        )}

                        {audience === "saved" && (
                            <div className="space-y-1.5">
                                <span className="text-xs font-semibold text-gray-300">Product they saved</span>
                                <ItemPicker kind="product" value={savedProduct} onChange={setSavedProduct} label="Search the product people saved" />
                            </div>
                        )}

                        {toGuests && (
                            <div className="space-y-2">
                                <span id="cn-installed" className="text-xs font-semibold text-gray-300">Installed</span>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cn-installed">
                                    {installedLabels.map(({ value, label }) => (
                                        <button key={label} type="button" role="radio" aria-checked={installedWithin === value} onClick={() => setInstalledWithin(value)} className={chip(installedWithin === value)}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-500">Phones that downloaded the app, allowed notifications and haven&apos;t signed in. They join from the new app version on; signing in takes a phone off this list.</p>
                                {!text.title.trim() && !text.body.trim() && (
                                    <button type="button" onClick={() => loadTemplate(guestWelcome)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#86efac]/40 text-xs font-semibold text-[#86efac] hover:bg-[#86efac]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50">
                                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Use the welcome message
                                    </button>
                                )}
                            </div>
                        )}

                        {audience === "selected" && pageRole && (
                            <p className="text-[11px] text-gray-500">{linkName} is only for {roleWords[pageRole]}: the others you ticked won&apos;t get it.</p>
                        )}

                        <p className="text-sm text-gray-300" aria-live="polite">
                            {isCounting
                                ? <span className="inline-flex items-center gap-2 text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Counting…</span>
                                : count && toGuests
                                    ? <><span className="text-lg font-black text-[#86efac]">{count.phones.toLocaleString("en-IN")}</span> {count.phones === 1 ? "phone" : "phones"} can get this{count.hindi ? <span className="text-gray-500"> · {count.hindi.toLocaleString("en-IN")} in Hindi</span> : null}</>
                                : count
                                    ? <><span className="text-lg font-black text-[#86efac]">{count.people.toLocaleString("en-IN")}</span> {count.people === 1 ? "person" : "people"} will get this <span className="text-gray-500">· {count.phones.toLocaleString("en-IN")} {count.phones === 1 ? "phone" : "phones"} signed in{count.skipped > 0 ? ` · ${count.skipped} left out` : ""}</span></>
                                    : <span className="text-gray-500">{audience === "saved" ? "Pick a product to see how many people saved it." : audience === "selected" ? "Tick people in the list below." : "—"}</span>}
                        </p>
                    </section>

                    {/* 2 · Message */}
                    <section className={section} aria-labelledby="cn-step-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 id="cn-step-2" className={sectionTitle}><span className={stepBadge} aria-hidden="true">2</span>Message</h3>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={insertName}
                                className="h-8 px-3 rounded-md border border-[#333] text-xs font-semibold text-gray-300 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50"
                                aria-label="Insert {name} at the cursor: each person's first name"
                            >
                                + {"{name}"}
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor="cn-title" className="text-xs font-semibold text-gray-300">Title</label>
                                <span className={`text-[11px] ${titleLength > TITLE_LOCK_SCREEN ? "text-amber-400" : "text-gray-500"}`}>
                                    {titleLength}/100 · {titleLength > TITLE_LOCK_SCREEN ? "may be cut off on the lock screen" : "fits the lock screen"}
                                </span>
                            </div>
                            <Input id="cn-title" ref={refs.title} maxLength={100} placeholder="e.g. Hi {name}, your cart is waiting" className="bg-[#161616] border-[#333] text-white h-11" {...textProps("title")} />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor="cn-body" className="text-xs font-semibold text-gray-300">Message</label>
                                <span className="text-[11px] text-gray-500">{text.body.length}/500</span>
                            </div>
                            <Textarea id="cn-body" ref={refs.body} maxLength={500} placeholder="What do you want to tell them?" className="bg-[#161616] border-[#333] text-white min-h-[110px] resize-y" {...textProps("body")} />
                            {toGuests
                                ? <p className={`text-[11px] ${usesName ? "text-amber-400" : "text-gray-500"}`}>These phones have no name yet, so {"{name}"} becomes &quot;there&quot; (&quot;जी&quot; in Hindi).</p>
                                : <p className="text-[11px] text-gray-500">{"{name}"} becomes each person&apos;s first name (&quot;there&quot; when the account has none).</p>}
                        </div>

                        <div className="rounded-lg border border-[#333]">
                            <button type="button" aria-expanded={showHindi} aria-controls="cn-hindi" onClick={() => setShowHindi((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-white hover:bg-white/5 rounded-lg">
                                {showHindi ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                                Hindi version (optional)
                                {hasHindi && !showHindi && <span className="text-xs font-normal text-[#86efac]">· added</span>}
                            </button>
                            {showHindi && (
                                <div id="cn-hindi" className="space-y-3 px-3 pb-3">
                                    <p className="text-[11px] text-gray-500">People whose app is in Hindi get this text. Leave both empty to send English to everyone.</p>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <label htmlFor="cn-title-hi" className="text-xs font-semibold text-gray-300">Hindi title</label>
                                            <span className={`text-[11px] ${text.titleHi.length > TITLE_LOCK_SCREEN ? "text-amber-400" : "text-gray-500"}`}>{text.titleHi.length}/100</span>
                                        </div>
                                        <Input id="cn-title-hi" lang="hi" ref={refs.titleHi} maxLength={100} placeholder="जैसे: नमस्ते {name}, आपका कार्ट इंतज़ार कर रहा है" className="bg-[#161616] border-[#333] text-white h-11" {...textProps("titleHi")} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <label htmlFor="cn-body-hi" className="text-xs font-semibold text-gray-300">Hindi message</label>
                                            <span className="text-[11px] text-gray-500">{text.bodyHi.length}/500</span>
                                        </div>
                                        <Textarea id="cn-body-hi" lang="hi" ref={refs.bodyHi} maxLength={500} className="bg-[#161616] border-[#333] text-white min-h-[90px] resize-y" {...textProps("bodyHi")} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3 · When tapped, open */}
                    <section className={section} aria-labelledby="cn-step-3">
                        <h3 id="cn-step-3" className={sectionTitle}><span className={stepBadge} aria-hidden="true">3</span>When tapped, open</h3>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cn-step-3">
                            {linkChoices.filter((key) => toGuests || !isGuestOnly(key)).map((key) => {
                                const blocked = choiceBlocked(key)
                                const role = isPage(key) ? pageRoles[key] : undefined
                                return (
                                    <button key={key} type="button" role="radio" aria-checked={choice === key} disabled={Boolean(blocked)} title={blocked || (role ? `Only for ${roleWords[role]}` : undefined)} onClick={() => chooseLink(key)} className={chip(choice === key)}>
                                        {key === "wholesaler" && <UserPlus className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />}
                                        {choiceLabel(key)}
                                        {role && <span className="sr-only"> (only for {roleWords[role]})</span>}
                                    </button>
                                )
                            })}
                        </div>
                        {toGuests && (
                            <p className="text-[11px] text-gray-500">Cart, Wishlist, My orders, Apply for Wholesaler and Ask your price need an account, so they&apos;re off for phones that aren&apos;t signed in.</p>
                        )}
                        {(audience === "buyers" || audience === "wholesalers") && (
                            <p className="text-[11px] text-gray-500">
                                {audience === "buyers" ? "Ask your price is for wholesalers, so it's off for All customers." : "Apply for Wholesaler is for customers, so it's off for All wholesalers."}
                            </p>
                        )}
                        {(choice === "product" || choice === "category" || choice === "sale") && (
                            <ItemPicker key={choice} kind={choice} value={linkTarget} onChange={pickTarget} disabledReason={saleBlocked} />
                        )}
                        <p className="text-[11px] text-gray-500">On older app versions, pages they don&apos;t know yet open the message instead.</p>
                    </section>

                    {/* 4 · Extras */}
                    <section className={section} aria-labelledby="cn-step-4">
                        <h3 id="cn-step-4" className={sectionTitle}><span className={stepBadge} aria-hidden="true">4</span>Extras</h3>
                        <div className="space-y-1.5">
                            <span id="cn-coupon" className="text-xs font-semibold text-gray-300 flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" aria-hidden="true" />Coupon</span>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cn-coupon">
                                <button type="button" role="radio" aria-checked={!couponCode} onClick={() => setCouponCode("")} className={chip(!couponCode)}>No coupon</button>
                                {offers === null && <span className="inline-flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading coupons…</span>}
                                {offers?.map((offer) => {
                                    const blocked = couponBlocked(offer)
                                    const group = offer.targetGroup === "all" ? "" : ` · ${offer.targetGroup === "buyer" ? "Customers" : "Wholesalers"}`
                                    return (
                                        <button key={offer._id} type="button" role="radio" aria-checked={couponCode === offer.code} disabled={Boolean(blocked) && couponCode !== offer.code} title={blocked || offer.title} onClick={() => setCouponCode(offer.code || "")} className={chip(couponCode === offer.code)}>
                                            <span className="font-mono">{offer.code}</span><span className="font-normal opacity-80">{group}</span>
                                            {blocked && <span className="sr-only"> ({blocked})</span>}
                                        </button>
                                    )
                                })}
                            </div>
                            {offers && offers.length === 0 && <p className="text-[11px] text-gray-500">No active coupons with a code. Create one in Offers.</p>}
                            {couponCode && !couponProblem && <p className="text-[11px] text-gray-500">Adds &quot;Use code {couponCode}.&quot; to the message{hasHindi ? ` (Hindi: "कोड ${couponCode} इस्तेमाल करें।")` : ""}.</p>}
                            {couponProblem && <p className="text-[11px] text-amber-400">{couponProblem}. Pick another coupon or change who it goes to.</p>}
                            {audience === "selected" && couponCode && chosenOffer && chosenOffer.targetGroup !== "all" && <p className="text-[11px] text-gray-500">Everyone you ticked must be {roleWords[chosenOffer.targetGroup]}.</p>}
                        </div>
                        <NotificationPictureField link={linkTarget} imageMode={imageMode} onImageModeChange={setImageMode} customImage={customImage} onCustomImageChange={setCustomImage} />
                    </section>
                </div>

                <div className="xl:sticky xl:top-4 self-start space-y-4">
                    <PhonePreview
                        title={text.title}
                        body={text.body}
                        titleHi={text.titleHi}
                        bodyHi={text.bodyHi}
                        image={sendImage}
                        couponCode={couponCode}
                        opens={opensText}
                        previewName={toGuests ? "there" : "Ramesh"}
                    />
                    <Button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        disabled={Boolean(problem) || isSending}
                        className="w-full bg-[#86efac] text-black hover:bg-[#a7f3d0] font-black h-12 gap-2"
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        Review and send{count ? ` to ${peopleText}` : ""}
                    </Button>
                    {problem && <p className="text-xs text-gray-500 text-center">{problem}</p>}
                </div>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={(open) => !isSending && setConfirmOpen(open)}>
                <AlertDialogContent className="bg-[#161616] border-[#333] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send to {peopleText}?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-gray-400">
                                {toGuests
                                    ? <p>A push to phones that have the app but no account. They have no inbox, so only the push arrives. This can&apos;t be undone.</p>
                                    : <p>Everyone gets it in the app&apos;s inbox, and as a push on phones where they&apos;re signed in{count ? ` (${count.phones.toLocaleString("en-IN")} ${count.phones === 1 ? "phone" : "phones"})` : ""}. This can&apos;t be undone.</p>}
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg border border-[#333] bg-[#0D0D0D] p-3">
                                    <dt className="text-gray-500">Send to</dt>
                                    <dd className="text-white">{audienceSummary(audience, segment, savedProduct?.name, audience === "selected" ? selectedIds.length : undefined, installedWithin)}{count?.skipped ? ` · ${count.skipped} left out` : ""}</dd>
                                    <dt className="text-gray-500">Title</dt>
                                    <dd className="text-white break-words">{text.title}</dd>
                                    <dt className="text-gray-500">Opens</dt>
                                    <dd className="text-white">{opensText}</dd>
                                    <dt className="text-gray-500">Coupon</dt>
                                    <dd className="text-white">{couponCode || "None"}</dd>
                                    <dt className="text-gray-500">Languages</dt>
                                    <dd className="text-white">{hasHindi ? "English, and Hindi for people using the app in Hindi" : "English for everyone"}</dd>
                                    {usesName && (<>
                                        <dt className="text-gray-500">Names</dt>
                                        <dd className="text-white">{toGuests ? <>{"{name}"} shows as &quot;there&quot; (no account, no name)</> : <>Each person&apos;s first name fills {"{name}"}</>}</dd>
                                    </>)}
                                </dl>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSending} className="border-[#333] bg-transparent text-white hover:bg-white/5">Back</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSending}
                            onClick={(e) => { e.preventDefault(); void send() }}
                            className="bg-[#86efac] text-black hover:bg-[#a7f3d0] font-bold"
                        >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

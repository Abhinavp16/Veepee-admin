"use client"

import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import {
    BadgeCheck,
    CircleDollarSign,
    Headphones,
    Loader2,
    Package,
    Pencil,
    RefreshCcw,
    ShieldCheck,
    Trash2,
    Truck,
    Upload,
    Wrench,
} from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type LabelSourceType = "image" | "icon"

type WebsiteLabel = {
    title: string
    sourceType: LabelSourceType
    image: string
    icon: string
    order: number
}

const ICON_OPTIONS = [
    { value: "refresh", label: "Return", Icon: RefreshCcw },
    { value: "badge", label: "Quality", Icon: BadgeCheck },
    { value: "package", label: "Delivery", Icon: Package },
    { value: "support", label: "Support", Icon: Headphones },
    { value: "shield", label: "Protection", Icon: ShieldCheck },
    { value: "value", label: "Value", Icon: CircleDollarSign },
    { value: "truck", label: "Shipping", Icon: Truck },
    { value: "service", label: "Service", Icon: Wrench },
] as const

const iconMap = Object.fromEntries(ICON_OPTIONS.map((item) => [item.value, item.Icon])) as Record<string, (props: { className?: string }) => JSX.Element>

function createEmptyLabel(order = 0): WebsiteLabel {
    return {
        title: "",
        sourceType: "icon",
        image: "",
        icon: ICON_OPTIONS[0].value,
        order,
    }
}

function normalizeLabel(value: any, order: number): WebsiteLabel {
    const icon = String(value?.icon || ICON_OPTIONS[0].value).trim()
    const sourceType: LabelSourceType = value?.sourceType === "image" ? "image" : "icon"

    return {
        title: String(value?.title || "").trim(),
        sourceType,
        image: String(value?.image || "").trim(),
        icon: iconMap[icon] ? icon : ICON_OPTIONS[0].value,
        order: Number.isFinite(value?.order) ? value.order : order,
    }
}

function LabelVisual({ label, large = false }: { label: WebsiteLabel; large?: boolean }) {
    if (label.sourceType === "image" && label.image) {
        return (
            <img
                src={label.image}
                alt={label.title || "Label"}
                className={large ? "h-14 w-14 object-contain" : "h-14 w-14 object-contain"}
                onError={(event) => {
                    event.currentTarget.style.display = "none"
                }}
            />
        )
    }

    const IconComponent = iconMap[label.icon] || BadgeCheck
    return <IconComponent className={large ? "h-14 w-14 text-[#2d5f67]" : "h-14 w-14 text-[#86efac]"} />
}

function hasVisual(label: WebsiteLabel) {
    return label.sourceType === "image" ? Boolean(label.image.trim()) : Boolean(label.icon.trim())
}

export default function LabelsPage() {
    const [labels, setLabels] = useState<WebsiteLabel[]>([])
    const [draftLabel, setDraftLabel] = useState<WebsiteLabel>(createEmptyLabel())
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        loadLabels()
    }, [])

    async function loadLabels() {
        try {
            const res = await apiFetch("/admin/website-settings")
            const data = await res.json()
            if (!res.ok || !data?.data) throw new Error("failed")

            const nextLabels = Array.isArray(data.data.labels)
                ? data.data.labels.map((item: any, index: number) => normalizeLabel(item, index))
                : []
            setLabels(nextLabels)
        } catch {
            toast.error("Failed to load labels")
        } finally {
            setIsLoading(false)
        }
    }

    function resetDraft() {
        setEditingIndex(null)
        setDraftLabel(createEmptyLabel(labels.length))
        setIsUploading(false)
    }

    function startEdit(index: number) {
        setEditingIndex(index)
        setDraftLabel({ ...labels[index] })
    }

    async function uploadDraftImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append("image", file)

        try {
            const res = await apiFetch("/upload/image?folder=website", {
                method: "POST",
                body: formData,
            })
            const data = await res.json()
            if (!res.ok || !data?.success || !data?.data?.url) {
                throw new Error(data?.message || "Upload failed")
            }

            setDraftLabel((prev) => ({ ...prev, image: String(data.data.url), sourceType: "image" }))
            toast.success("Label image uploaded")
        } catch (error: any) {
            toast.error(error?.message || "Failed to upload label image")
        } finally {
            setIsUploading(false)
            event.target.value = ""
        }
    }

    async function removeLabel(index: number) {
        const nextLabels = labels.filter((_, itemIndex) => itemIndex !== index)
        const saved = await persistLabels(nextLabels)
        if (saved && editingIndex === index) {
            resetDraft()
        } else if (saved && editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1)
        }
    }

    async function persistLabels(nextLabels: WebsiteLabel[]) {
        const payload = nextLabels
            .map((item, index) => ({
                title: item.title.trim(),
                sourceType: item.sourceType,
                image: item.image.trim(),
                icon: item.icon.trim(),
                isActive: true,
                order: index,
            }))
            .filter((item) => item.title && (item.sourceType === "image" ? item.image : item.icon))

        setIsSaving(true)
        try {
            const res = await apiFetch("/admin/website-settings", {
                method: "PUT",
                body: JSON.stringify({ labels: payload }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.message || "Failed to save labels")
            }

            setLabels(payload.map((item, index) => normalizeLabel(item, index)))
            toast.success("Labels saved successfully")
            return true
        } catch (error: any) {
            toast.error(error?.message || "Failed to save labels")
            return false
        } finally {
            setIsSaving(false)
        }
    }

    async function saveDraftLabel() {
        if (!draftLabel.title.trim()) {
            toast.error("Label text is required")
            return
        }

        if (!hasVisual(draftLabel)) {
            toast.error("Choose an icon or upload an image")
            return
        }

        if (draftLabel.sourceType === "image" && !draftLabel.image.trim()) {
            toast.error("Add an image for image mode")
            return
        }

        const targetIndex = editingIndex === null ? labels.length : editingIndex
        const normalizedDraft = normalizeLabel(
            {
                ...draftLabel,
                title: draftLabel.title.trim(),
                image: draftLabel.image.trim(),
                order: targetIndex,
            },
            targetIndex
        )

        const nextLabels =
            editingIndex === null
                ? [...labels, normalizedDraft]
                : labels.map((item, index) => (index === editingIndex ? normalizedDraft : item))

        const saved = await persistLabels(nextLabels)
        if (saved) {
            resetDraft()
        }
    }

    const savedLabels = useMemo(
        () => labels.filter((item) => item.title.trim() && hasVisual(item)),
        [labels]
    )

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Labels</h1>
                <p className="mt-1 text-sm text-[#919191]">Add or edit labels in the form below. Saved labels appear underneath as cards.</p>
            </div>

            <Card className="border-[#333] bg-[#161616]">
                <CardHeader>
                    <CardTitle className="text-white">{editingIndex === null ? "Label Form" : `Edit Label ${editingIndex + 1}`}</CardTitle>
                    <CardDescription className="text-[#919191]">
                        This preview is only for the label you are editing right now, and it will be used on product detail in the app.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_300px] xl:grid-cols-[minmax(0,1.6fr)_320px]">
                        <div className="min-w-0 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-white">Label Text</label>
                                <Input
                                    value={draftLabel.title}
                                    onChange={(event) => setDraftLabel((prev) => ({ ...prev, title: event.target.value }))}
                                    placeholder="e.g. Verified Seller"
                                    className="border-[#333] bg-[#0D0D0D] text-white"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-white">Visual Type</label>
                                <div className="flex rounded-2xl border border-[#303030] bg-[#0D0D0D] p-1">
                                    <button
                                        type="button"
                                        className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${draftLabel.sourceType === "icon" ? "bg-[#86efac] text-black" : "text-[#9b9b9b] hover:text-white"}`}
                                        onClick={() => setDraftLabel((prev) => ({ ...prev, sourceType: "icon" }))}
                                    >
                                        Icon
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${draftLabel.sourceType === "image" ? "bg-[#86efac] text-black" : "text-[#9b9b9b] hover:text-white"}`}
                                        onClick={() => setDraftLabel((prev) => ({ ...prev, sourceType: "image" }))}
                                    >
                                        Image
                                    </button>
                                </div>
                            </div>

                            {draftLabel.sourceType === "image" ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-white">Image URL</label>
                                        <Input
                                            value={draftLabel.image}
                                            onChange={(event) => setDraftLabel((prev) => ({ ...prev, image: event.target.value }))}
                                            placeholder="https://example.com/label-logo.png"
                                            className="border-[#333] bg-[#0D0D0D] text-white"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="inline-flex">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={uploadDraftImage}
                                                disabled={isUploading}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                                                disabled={isUploading}
                                                asChild
                                            >
                                                <span>
                                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                    Upload Logo
                                                </span>
                                            </Button>
                                        </label>
                                        <span className="text-xs text-[#7d7d7d]">Square transparent logos work best here.</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-white">Choose Icon</label>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                                        {ICON_OPTIONS.map((option) => {
                                            const SelectedIcon = option.Icon
                                            const isSelected = draftLabel.icon === option.value

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setDraftLabel((prev) => ({ ...prev, icon: option.value }))}
                                                    className={`min-h-[132px] rounded-[24px] border px-4 py-5 text-center transition-colors ${isSelected ? "border-[#86efac] bg-[#86efac]/10 text-white" : "border-[#303030] bg-[#0D0D0D] text-[#a0a0a0] hover:border-[#4d4d4d] hover:text-white"}`}
                                                >
                                                    <SelectedIcon className={`mx-auto mb-4 h-11 w-11 ${isSelected ? "text-[#86efac]" : "text-[#bdbdbd]"}`} />
                                                    <div className="text-sm font-medium leading-snug">{option.label}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-[#333] bg-[#111] p-4">
                            <p className="mb-3 text-sm font-medium text-white">Preview</p>
                            <div className="rounded-[32px] bg-[#eef8fb] p-4">
                                <div className="rounded-[28px] bg-[#dff1f4] p-5 shadow-sm">
                                    <div className="flex aspect-[0.95/1] flex-col items-center justify-center text-center">
                                        <div className="mb-4 flex items-center justify-center">
                                            <LabelVisual label={draftLabel} large />
                                        </div>
                                        <p className="text-2xl font-medium leading-tight text-[#2d5f67]">
                                            {draftLabel.title.trim() || "Your Label"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {editingIndex !== null && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetDraft}
                                className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                            >
                                Cancel Edit
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={() => {
                                void saveDraftLabel()
                            }}
                            className="bg-[#86efac] text-black hover:bg-[#86efac]/90"
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Label
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {savedLabels.length === 0 ? (
                <Card className="border-[#333] bg-[#161616]">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <BadgeCheck className="h-10 w-10 text-[#86efac]" />
                        <div>
                            <p className="text-sm text-white">No saved labels yet.</p>
                            <p className="text-xs text-[#7d7d7d]">Create a label in the form above and save it to see it here.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {savedLabels.map((label, index) => (
                        <Card key={`${label.title}-${index}`} className="border-[#333] bg-[#161616]">
                            <CardContent className="p-3">
                                <div className="mb-2 rounded-[16px] bg-[#eef8fb] p-2">
                                    <div className="rounded-[12px] bg-[#dff1f4] p-2">
                                        <div className="flex aspect-square flex-col items-center justify-center text-center">
                                            <div className="mb-2 flex items-center justify-center">
                                                <LabelVisual label={label} />
                                            </div>
                                            <p className="line-clamp-2 text-xs font-medium leading-tight text-[#2d5f67]">{label.title}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                                            onClick={() => startEdit(index)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                            onClick={() => {
                                                void removeLabel(index)
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

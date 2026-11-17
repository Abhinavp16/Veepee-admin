"use client"

import { useEffect, useState } from "react"
import { FileText, ListPlus, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NewFeatureHint, NewPill, useNewOnPage } from "@/components/whats-new"
import { apiFetch } from "@/lib/api"
import { emptyTemplates, fetchProductTemplates, type ProductTemplates, type SpecSet, type TextBlock } from "@/lib/product-templates"

// Settings → Product templates: text most products share, typed once.
// Shipping & Returns and Warranty show on every product that uses them;
// specification sets and text blocks are added to a product from its form.
// Saved on its own (the page's Save button doesn't touch it).

const label = "text-[11px] uppercase text-gray-400 font-bold tracking-[0.1em]"
const field = "bg-[#0D0D0D] border-[#333] text-white"

export function ProductTemplatesCard() {
    const [templates, setTemplates] = useState<ProductTemplates>(emptyTemplates)
    const [isLoading, setIsLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const feature = useNewOnPage("product-templates")

    // Not loaded: no editing and no Save, so empty boxes can never replace
    // the saved text.
    async function load() {
        setIsLoading(true)
        const saved = await fetchProductTemplates()
        if (saved) setTemplates(saved)
        setLoadFailed(!saved)
        setIsLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const setSet = (index: number, next: SpecSet) =>
        setTemplates((t) => ({ ...t, specSets: t.specSets.map((s, i) => (i === index ? next : s)) }))
    const setBlock = (index: number, next: TextBlock) =>
        setTemplates((t) => ({ ...t, textBlocks: t.textBlocks.map((b, i) => (i === index ? next : b)) }))

    async function save() {
        // Rows half filled in are dropped; a set or block needs a name.
        const specSets = templates.specSets
            .map((set) => ({
                name: set.name.trim(),
                items: set.items
                    .map((item) => ({ key: item.key.trim(), value: item.value.trim() }))
                    .filter((item) => item.key && item.value),
            }))
            .filter((set) => set.name || set.items.length > 0)
        const textBlocks = templates.textBlocks
            .map((block) => ({ name: block.name.trim(), text: block.text }))
            .filter((block) => block.name || block.text.trim())
        if (specSets.some((set) => !set.name) || textBlocks.some((block) => !block.name)) {
            toast.error("Give every specification set and text block a name")
            return
        }
        setIsSaving(true)
        try {
            const res = await apiFetch("/admin/settings", {
                method: "PUT",
                body: JSON.stringify({
                    productTemplates: {
                        shippingTerms: templates.shippingTerms,
                        warranty: templates.warranty,
                        specSets,
                        textBlocks,
                    },
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.message || "Could not save")
            setTemplates((t) => ({ ...t, specSets, textBlocks }))
            toast.success("Product templates saved. Products using the shared text show it now.")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card className={`bg-[#161616] border-[#333] ${feature.isNew ? "whats-new-glow" : ""}`}>
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Product templates {feature.isNew && <NewPill />}
                </CardTitle>
                <CardDescription>
                    Type common product text once. Shipping &amp; Returns and Warranty show on every product that uses
                    them, and changing them here changes them on all those products. Specification sets and text blocks
                    can be added to a product in one click from its form.
                </CardDescription>
                <NewFeatureHint feature={feature} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-8">
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#86efac]" /></div>
                ) : loadFailed ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <p className="text-sm text-red-400">Couldn&apos;t load the product templates. Nothing has been changed.</p>
                        <Button type="button" variant="outline" className="border-[#333]" onClick={load}>Try again</Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="tpl-shipping" className={label}>Shipping &amp; Returns</label>
                                <Textarea
                                    id="tpl-shipping"
                                    value={templates.shippingTerms}
                                    onChange={(e) => setTemplates((t) => ({ ...t, shippingTerms: e.target.value }))}
                                    className={`${field} min-h-[180px]`}
                                    placeholder="Delivery times, charges, return and replacement rules…"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="tpl-warranty" className={label}>Warranty</label>
                                <Textarea
                                    id="tpl-warranty"
                                    value={templates.warranty}
                                    onChange={(e) => setTemplates((t) => ({ ...t, warranty: e.target.value }))}
                                    className={`${field} min-h-[180px]`}
                                    placeholder="What the warranty covers, what it doesn't, how to claim…"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className={label}>Specification sets</span>
                                <Button type="button" variant="outline" size="sm" className="border-[#333]"
                                    onClick={() => setTemplates((t) => ({ ...t, specSets: [...t.specSets, { name: "", items: [{ key: "", value: "" }] }] }))}>
                                    <Plus className="h-4 w-4 mr-1" /> Add set
                                </Button>
                            </div>
                            {templates.specSets.length === 0 && <p className="text-sm text-gray-500">No sets yet. Add one, e.g. &quot;Power tools&quot; with Warranty, Voltage and Power.</p>}
                            {templates.specSets.map((set, setIndex) => (
                                <div key={setIndex} className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Input aria-label="Set name" value={set.name} placeholder="Set name, e.g. Standard OXON"
                                            onChange={(e) => setSet(setIndex, { ...set, name: e.target.value })} className={`${field} font-semibold`} />
                                        <Button type="button" variant="ghost" size="icon" aria-label={`Delete set ${set.name}`} className="text-red-400 hover:bg-red-400/10 shrink-0"
                                            onClick={() => setTemplates((t) => ({ ...t, specSets: t.specSets.filter((_, i) => i !== setIndex) }))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {set.items.map((item, itemIndex) => (
                                        <div key={itemIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                            <Input aria-label="Specification" value={item.key} placeholder="e.g. Warranty" className={field}
                                                onChange={(e) => setSet(setIndex, { ...set, items: set.items.map((it, i) => (i === itemIndex ? { ...it, key: e.target.value } : it)) })} />
                                            <Input aria-label="Value" value={item.value} placeholder="e.g. 1 year" className={field}
                                                onChange={(e) => setSet(setIndex, { ...set, items: set.items.map((it, i) => (i === itemIndex ? { ...it, value: e.target.value } : it)) })} />
                                            <Button type="button" variant="ghost" size="icon" aria-label="Remove row" className="text-gray-500 hover:text-red-400"
                                                onClick={() => setSet(setIndex, { ...set, items: set.items.filter((_, i) => i !== itemIndex) })}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="ghost" size="sm" className="text-[#86efac] hover:bg-[#86efac]/10"
                                        onClick={() => setSet(setIndex, { ...set, items: [...set.items, { key: "", value: "" }] })}>
                                        <ListPlus className="h-4 w-4 mr-1" /> Add row
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className={label}>Text blocks</span>
                                <Button type="button" variant="outline" size="sm" className="border-[#333]"
                                    onClick={() => setTemplates((t) => ({ ...t, textBlocks: [...t.textBlocks, { name: "", text: "" }] }))}>
                                    <Plus className="h-4 w-4 mr-1" /> Add text block
                                </Button>
                            </div>
                            {templates.textBlocks.length === 0 && <p className="text-sm text-gray-500">No text blocks yet. Add paragraphs you often put in descriptions, e.g. safety instructions or an FAQ.</p>}
                            {templates.textBlocks.map((block, blockIndex) => (
                                <div key={blockIndex} className="rounded-lg border border-[#333] bg-[#0D0D0D] p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input aria-label="Block name" value={block.name} placeholder="Name, e.g. Safety instructions"
                                            onChange={(e) => setBlock(blockIndex, { ...block, name: e.target.value })} className={`${field} font-semibold`} />
                                        <Button type="button" variant="ghost" size="icon" aria-label={`Delete text block ${block.name}`} className="text-red-400 hover:bg-red-400/10 shrink-0"
                                            onClick={() => setTemplates((t) => ({ ...t, textBlocks: t.textBlocks.filter((_, i) => i !== blockIndex) }))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Textarea aria-label="Text" value={block.text} className={`${field} min-h-[90px]`}
                                        onChange={(e) => setBlock(blockIndex, { ...block, text: e.target.value })} />
                                </div>
                            ))}
                        </div>

                        <Button type="button" onClick={save} disabled={isSaving} className="w-full bg-[#86efac] hover:bg-[#86efac]/90 text-black">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save product templates
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

"use client"

import { useEffect, useState } from "react"
import { BookmarkPlus, ChevronDown, FileText, Loader2, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    MAX_TEMPLATES,
    fetchNotificationTemplates,
    linkLabel,
    saveNotificationTemplates,
    type NotificationTemplate,
} from "@/lib/custom-notifications"

// "Start from a saved message ▾": the saved messages (Settings →
// notificationTemplates), "Save this message" and "Manage saved messages…".
// Saving sends only that list, so no other setting changes.

const field = "bg-[#0D0D0D] border-[#333] text-white"

export function SavedMessagesMenu({ onLoad, current, canSave }: {
    onLoad: (template: NotificationTemplate) => void
    current: () => Omit<NotificationTemplate, "name">
    canSave: boolean
}) {
    // null: not loaded (then nothing can be saved over the list).
    const [templates, setTemplates] = useState<NotificationTemplate[] | null>(null)
    const [loadFailed, setLoadFailed] = useState(false)
    const [saveOpen, setSaveOpen] = useState(false)
    const [manageOpen, setManageOpen] = useState(false)

    async function load() {
        const saved = await fetchNotificationTemplates()
        setTemplates(saved)
        setLoadFailed(!saved)
    }

    useEffect(() => {
        load()
    }, [])

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] gap-2">
                        <FileText className="w-4 h-4" aria-hidden="true" /> Start from a saved message <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#161616] border-[#333] text-white w-80 max-h-[70vh] overflow-y-auto">
                    <DropdownMenuLabel className="text-gray-400 text-xs">Saved messages</DropdownMenuLabel>
                    {templates === null && !loadFailed && <p className="px-2 py-2 text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</p>}
                    {loadFailed && (
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); setLoadFailed(false); load() }} className="text-xs text-red-400">
                            Couldn&apos;t load them. Try again
                        </DropdownMenuItem>
                    )}
                    {templates?.length === 0 && <p className="px-2 py-2 text-xs text-gray-500">None saved yet.</p>}
                    {templates?.map((template, index) => (
                        <DropdownMenuItem key={`${template.name}-${index}`} onClick={() => onLoad(template)} className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-semibold">{template.name}</span>
                            <span className="text-xs text-gray-500 line-clamp-2">{template.title}{template.link ? ` · Opens ${linkLabel(template.link)}` : ""}{template.titleHi ? " · हिंदी" : ""}</span>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-[#333]" />
                    <DropdownMenuItem disabled={!templates || !canSave} onClick={() => setSaveOpen(true)} className="gap-2">
                        <BookmarkPlus className="w-4 h-4" aria-hidden="true" /> Save this message…
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!templates} onClick={() => setManageOpen(true)} className="gap-2">
                        <Settings2 className="w-4 h-4" aria-hidden="true" /> Manage saved messages…
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {templates && (
                <SaveMessageDialog
                    open={saveOpen}
                    onOpenChange={setSaveOpen}
                    templates={templates}
                    current={current}
                    onSaved={setTemplates}
                />
            )}
            {templates && manageOpen && (
                <ManageMessagesDialog
                    open={manageOpen}
                    onOpenChange={setManageOpen}
                    templates={templates}
                    onSaved={setTemplates}
                />
            )}
        </>
    )
}

function SaveMessageDialog({ open, onOpenChange, templates, current, onSaved }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    templates: NotificationTemplate[]
    current: () => Omit<NotificationTemplate, "name">
    onSaved: (templates: NotificationTemplate[]) => void
}) {
    const [name, setName] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const trimmed = name.trim()
    const replaces = templates.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())

    useEffect(() => {
        if (open) setName("")
    }, [open])

    async function save(e: React.FormEvent) {
        e.preventDefault()
        if (!trimmed) return
        if (!replaces && templates.length >= MAX_TEMPLATES) {
            toast.error(`You can keep up to ${MAX_TEMPLATES} saved messages. Delete one first.`)
            return
        }
        const entry = { ...current(), name: trimmed }
        const next = replaces
            ? templates.map((t) => (t.name.toLowerCase() === trimmed.toLowerCase() ? entry : t))
            : [...templates, entry]
        setIsSaving(true)
        try {
            onSaved(await saveNotificationTemplates(next))
            toast.success(replaces ? `"${trimmed}" updated` : `Saved as "${trimmed}"`)
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#161616] border-[#333] text-white max-w-md">
                <form onSubmit={save} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Save this message</DialogTitle>
                        <DialogDescription>Keeps the title, message, Hindi text, link and picture. Who it goes to and coupons aren&apos;t saved.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <label htmlFor="cn-save-name" className="text-xs font-semibold text-gray-300">Name</label>
                        <Input id="cn-save-name" autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monsoon sprayer offer" className={field} />
                        {replaces && <p className="text-[11px] text-amber-400">A saved message with this name will be replaced.</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!trimmed || isSaving} className="bg-[#86efac] text-black hover:bg-[#a7f3d0] font-bold">
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function ManageMessagesDialog({ open, onOpenChange, templates, onSaved }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    templates: NotificationTemplate[]
    onSaved: (templates: NotificationTemplate[]) => void
}) {
    const [list, setList] = useState<NotificationTemplate[]>(() => templates.map((t) => ({ ...t })))
    const [isSaving, setIsSaving] = useState(false)
    const update = (index: number, patch: Partial<NotificationTemplate>) =>
        setList((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

    async function save() {
        if (list.some((t) => !t.name.trim())) {
            toast.error("Give every saved message a name")
            return
        }
        setIsSaving(true)
        try {
            onSaved(await saveNotificationTemplates(list))
            toast.success("Saved messages updated")
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#161616] border-[#333] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Saved messages</DialogTitle>
                    <DialogDescription>Rename, edit or delete them. Changes are kept when you press Save changes.</DialogDescription>
                </DialogHeader>
                {list.length === 0 && <p className="text-sm text-gray-500 py-4">No saved messages. Use &quot;Save this message&quot; on the form.</p>}
                <ul className="space-y-3">
                    {list.map((template, index) => (
                        <li key={index} className="rounded-lg border border-[#333] bg-[#0D0D0D] p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <Input aria-label="Name" maxLength={60} value={template.name} onChange={(e) => update(index, { name: e.target.value })} className={`${field} font-semibold`} />
                                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${template.name || "this saved message"}`} className="text-red-400 hover:bg-red-400/10 shrink-0"
                                    onClick={() => setList((items) => items.filter((_, i) => i !== index))}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <Input aria-label={`Title of ${template.name}`} maxLength={100} value={template.title} onChange={(e) => update(index, { title: e.target.value })} className={field} />
                            <Textarea aria-label={`Message of ${template.name}`} maxLength={500} value={template.body} onChange={(e) => update(index, { body: e.target.value })} className={`${field} min-h-[70px]`} />
                            <p className="text-[11px] text-gray-500">Opens: {linkLabel(template.link)}{template.titleHi ? " · has Hindi text" : ""}{template.imageUrl ? " · has a picture" : ""}</p>
                        </li>
                    ))}
                </ul>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={save} disabled={isSaving} className="bg-[#86efac] text-black hover:bg-[#a7f3d0] font-bold">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState } from "react"
import { toast } from "sonner"
import { NotificationComposer, draftLink, type NotificationDraft } from "@/components/custom-notification/composer"
import { NotificationHistory } from "@/components/custom-notification/history"
import type { Campaign } from "@/lib/custom-notifications"

// Customers → Custom notification: "New | History".

type Tab = "new" | "history"

export function CustomNotificationPanel({ selectedIds, onSent, onClearSelection }: {
    selectedIds: string[]
    onSent: () => void
    onClearSelection: () => void
}) {
    const [tab, setTab] = useState<Tab>("new")
    const [draft, setDraft] = useState<NotificationDraft | null>(null)
    const [draftKey, setDraftKey] = useState(0)
    // A new History list after each send.
    const [historyKey, setHistoryKey] = useState(0)

    function sendAgain(campaign: Campaign) {
        setDraft({
            audience: campaign.audience,
            segment: campaign.segment || "all",
            savedProduct: campaign.audience === "saved" && campaign.productId
                ? { type: "product", id: String(campaign.productId), name: campaign.productName || "The product", image: "" }
                : null,
            title: campaign.title,
            body: campaign.body,
            titleHi: campaign.titleHi || "",
            bodyHi: campaign.bodyHi || "",
            couponCode: campaign.couponCode || "",
            ...draftLink(campaign.link, campaign.imageUrl),
        })
        setDraftKey((k) => k + 1)
        setTab("new")
        toast.message(campaign.audience === "selected"
            ? "Loaded. Tick the people to send it to in the list, then review it."
            : "Loaded into the form. Review it before sending.")
    }

    const tabClass = (active: boolean) =>
        `h-9 px-4 rounded-md text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/50 ${active ? "bg-[#86efac] text-black" : "text-gray-400 hover:text-white"}`

    return (
        <div className="space-y-4">
            <div className="inline-flex gap-1 p-1 rounded-lg bg-[#0D0D0D] border border-[#333]" role="tablist" aria-label="Custom notification">
                <button type="button" role="tab" id="cn-tab-new" aria-controls="cn-panel-new" aria-selected={tab === "new"} className={tabClass(tab === "new")} onClick={() => setTab("new")}>New</button>
                <button type="button" role="tab" id="cn-tab-history" aria-controls="cn-panel-history" aria-selected={tab === "history"} className={tabClass(tab === "history")} onClick={() => setTab("history")}>History</button>
            </div>
            {/* Kept mounted, so switching tabs doesn't lose the draft. */}
            <div id="cn-panel-new" role="tabpanel" aria-labelledby="cn-tab-new" hidden={tab !== "new"}>
                <NotificationComposer
                    selectedIds={selectedIds}
                    onClearSelection={onClearSelection}
                    draft={draft}
                    draftKey={draftKey}
                    onSent={() => {
                        setHistoryKey((k) => k + 1)
                        onSent()
                    }}
                />
            </div>
            {tab === "history" && (
                <div id="cn-panel-history" role="tabpanel" aria-labelledby="cn-tab-history">
                    <NotificationHistory key={historyKey} onSendAgain={sendAgain} />
                </div>
            )}
        </div>
    )
}

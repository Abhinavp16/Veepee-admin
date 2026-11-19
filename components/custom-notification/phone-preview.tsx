"use client"

import { useState } from "react"
import { fillName } from "@/lib/custom-notifications"

// How the notification reads on a phone, in English or Hindi, with {name}
// shown as "Ramesh".

export function PhonePreview({ title, body, titleHi, bodyHi, image, couponCode, opens }: {
    title: string
    body: string
    titleHi: string
    bodyHi: string
    image: string
    couponCode: string
    opens: string
}) {
    const [language, setLanguage] = useState<"en" | "hi">("en")
    const hasHindi = Boolean(titleHi.trim() && bodyHi.trim())
    const hindi = language === "hi" && hasHindi
    const shownTitle = fillName(hindi ? titleHi : title) || "Title"
    const shownBody = fillName(hindi ? bodyHi : body) || "Your message will appear here."
    const coupon = couponCode ? (hindi ? ` कोड ${couponCode} इस्तेमाल करें।` : ` Use code ${couponCode}.`) : ""
    const option = (active: boolean) => `flex-1 h-8 rounded-md text-xs font-bold transition-colors ${active ? "bg-[#86efac] text-black" : "text-gray-400 hover:text-white"}`

    return (
        <div className="rounded-xl border border-[#333] bg-[#0D0D0D] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preview</h3>
                <div className="flex w-40 gap-1 p-1 rounded-lg bg-[#161616] border border-[#333]" role="group" aria-label="Preview language">
                    <button type="button" aria-pressed={language === "en"} className={option(language === "en")} onClick={() => setLanguage("en")}>English</button>
                    <button type="button" aria-pressed={language === "hi"} className={option(language === "hi")} onClick={() => setLanguage("hi")} lang="hi">हिंदी</button>
                </div>
            </div>
            {/* A phone outline with the notification on the lock screen. */}
            <div className="mx-auto max-w-[280px] rounded-[2rem] border-4 border-[#333] bg-[#1A1A1A] p-3 pt-6">
                <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#333]" aria-hidden="true" />
                <div className="rounded-xl bg-[#161616] border border-[#333] p-3" lang={hindi ? "hi" : "en"}>
                    <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-500">OXON · now</p>
                            <p className="mt-1 text-sm font-semibold text-white break-words line-clamp-2">{shownTitle}</p>
                            <p className="mt-0.5 text-sm text-gray-300 whitespace-pre-line break-words line-clamp-4">
                                {shownBody}
                                {coupon && <span className="font-semibold text-[#86efac]">{coupon}</span>}
                            </p>
                        </div>
                        {image && <img src={image} alt="" className="w-11 h-11 rounded-md object-cover bg-white shrink-0" />}
                    </div>
                    {image && <img src={image} alt="" className="mt-3 w-full aspect-[2/1] rounded-md object-cover bg-white" />}
                </div>
                <div className="h-24" aria-hidden="true" />
            </div>
            {language === "hi" && !hasHindi && <p className="text-[11px] text-amber-400">No Hindi text yet: people using the app in Hindi get the English one.</p>}
            <p className="text-[11px] text-gray-500 leading-relaxed">
                <span className="text-gray-300 font-semibold">Tapping opens:</span> {opens}.{" "}
                Sent as a push to their phones and kept in the app&apos;s inbox. iPhones show the text only in the push.
            </p>
        </div>
    )
}

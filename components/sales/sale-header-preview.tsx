"use client"

import type { CSSProperties } from "react"

import { Clock, Flame, Sparkles, Sprout, Tag, Tractor, Zap } from "lucide-react"
import { saleCardBorder, saleHeaderBackground, saleTheme, type SaleThemeKey } from "@/lib/sale-themes"

// Inline colours: the admin's global styles recolour text-white and bg-[#161616]
// classes for its light and dark looks, and this header keeps its own.
const WHITE = "#FFFFFF"

// Where the sparkles, streaks and pollen sit (mostly right, away from the text).
const SPOTS: [number, number][] = [
    [62, 16], [78, 30], [91, 12], [70, 62], [86, 74], [56, 44], [95, 46], [66, 86], [82, 54],
]

// What the top of the sale page looks like in the app, in the chosen theme:
// the diagonal gradient under a soft dot glow, the theme's moving touch and a
// shine across the offer (still under reduced motion). Colours are the
// theme's own, so they look the same in light and dark.
export function SaleHeaderPreview({
    theme: themeKey,
    name,
    subtitle,
    upToPercent,
    countdown,
    heroImage,
    compact = false,
}: {
    theme: SaleThemeKey | string
    name: string
    subtitle?: string
    upToPercent?: number | null
    countdown?: string
    heroImage?: string
    compact?: boolean
}) {
    const theme = saleTheme(themeKey)
    const title = name.trim() || "Sale name"
    const offer = upToPercent
        ? theme.key === "kisan" ? `Flat ${upToPercent}% off` : `Up to ${upToPercent}% off`
        : "Special prices"
    const motif = theme.key === "diwali"
        ? <><Flame className="sale-flicker h-4 w-4" /><Sparkles className="h-4 w-4" /><Flame className="sale-flicker h-4 w-4" /></>
        : theme.key === "clearance" ? <Tag className="sale-swing h-4 w-4" />
            : theme.key === "flash" ? <Zap className="sale-pulse h-4 w-4" />
                : <><Sprout className="sale-sway h-4 w-4" /><Tractor className="h-4 w-4" /></>
    const accentVars = { "--sale-accent": theme.accent } as CSSProperties

    return (
        <div
            data-testid="sale-header-preview"
            data-theme={theme.key}
            className={`relative overflow-hidden ${compact ? "rounded-2xl" : "rounded-t-2xl rounded-b-[32px]"}`}
            style={{
                backgroundImage: saleHeaderBackground(theme),
                border: compact ? `1px solid ${saleCardBorder(theme)}` : undefined,
            }}
        >
            {heroImage ? (
                <>
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
                    {/* The theme's gradient over the image keeps the text readable. */}
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `linear-gradient(to bottom right, color-mix(in srgb, ${theme.gradient[0]} 92%, transparent), color-mix(in srgb, ${theme.gradient[1]} 70%, transparent))`,
                        }}
                    />
                </>
            ) : null}
            <div aria-hidden className="sale-dot-glow absolute inset-0" />
            <div aria-hidden className="pointer-events-none absolute inset-0">
                {theme.key === "flash"
                    ? SPOTS.slice(0, 5).map(([, top], index) => (
                        <span
                            key={index}
                            className="sale-streak absolute left-0 h-[2px] w-9 rounded-full"
                            style={{ top: `${top}%`, backgroundColor: theme.glow, opacity: 0.3, animationDelay: `${index * -0.7}s` }}
                        />
                    ))
                    : theme.key === "kisan"
                        ? SPOTS.map(([left, top], index) => (
                            <span
                                key={index}
                                className="sale-rise absolute rounded-full"
                                style={{ left: `${left}%`, top: `${top}%`, width: 3 + (index % 3), height: 3 + (index % 3), backgroundColor: theme.glow, opacity: 0.4, animationDelay: `${index * -0.65}s` }}
                            />
                        ))
                        : SPOTS.map(([left, top], index) => (
                            <span
                                key={index}
                                className="sale-twinkle sale-star absolute"
                                style={{
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    width: theme.key === "diwali" ? 10 : 6,
                                    height: theme.key === "diwali" ? 10 : 6,
                                    backgroundColor: theme.glow,
                                    opacity: theme.key === "diwali" ? 0.6 : 0.35,
                                    animationDelay: `${index * -0.37}s`,
                                }}
                            />
                        ))}
            </div>

            <div className={`relative ${compact ? "px-3 pt-3" : "px-4 pt-4"} ${theme.key === "clearance" ? (compact ? "pb-8" : "pb-11") : compact ? "pb-3" : "pb-5"}`}>
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold" style={{ color: theme.eyebrow }}>{theme.tagline}</span>
                    <span className="flex gap-1" style={{ color: theme.eyebrow }}>{motif}</span>
                </div>
                <p className={`${compact ? "text-lg" : "text-2xl"} mt-1 font-extrabold leading-tight tracking-tight`} style={{ color: WHITE }}>
                    {theme.key === "flash" ? <Zap className="sale-pulse mr-1 inline h-5 w-5 align-[-3px]" style={{ color: theme.accent }} /> : null}
                    {title}
                </p>
                {subtitle ? <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.8)" }}>{subtitle}</p> : null}
                {theme.key === "clearance" ? (
                    <>
                        <p className={`sale-shine-text ${compact ? "text-xl" : "text-3xl"} mt-2 font-extrabold leading-tight tracking-tight`} style={accentVars}>
                            {upToPercent ? `Up to ${upToPercent}% OFF` : "Final prices"}
                        </p>
                        {countdown ? <div className="mt-2"><CountdownChip text={countdown} /></div> : null}
                    </>
                ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="sale-shine rounded-lg px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: theme.accent, color: theme.onAccent }}>
                            {offer}
                        </span>
                        {countdown ? <CountdownChip text={countdown} /> : null}
                    </div>
                )}
            </div>

            {theme.key === "clearance" ? (
                <div className={`absolute inset-x-0 overflow-hidden whitespace-pre py-1 text-[11px] font-extrabold tracking-widest ${compact ? "bottom-0" : "bottom-2"}`} style={{ backgroundColor: theme.accent, color: theme.onAccent }}>
                    <span className="sale-marquee inline-block">
                        {"CLEARANCE   •   ".repeat(16)}
                    </span>
                </div>
            ) : null}
        </div>
    )
}

// The frosted "Ends in 2d 14h" chip.
function CountdownChip({ text }: { text: string }) {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ color: WHITE, backgroundColor: "rgba(255, 255, 255, 0.14)", border: "1px solid rgba(255, 255, 255, 0.22)" }}
        >
            <Clock className="h-3.5 w-3.5" />
            {text}
        </span>
    )
}

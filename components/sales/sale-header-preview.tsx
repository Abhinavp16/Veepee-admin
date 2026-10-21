"use client"

import { saleHeaderBackground, saleTheme, type SaleThemeKey } from "@/lib/sale-themes"

// Inline colours: the admin's global styles recolour text-white and bg-[#161616]
// classes for its light and dark looks, and this header keeps its own.
const WHITE = "#FFFFFF"

// What the top of the sale page looks like in the app, in the chosen look
// (Diwali, Clearance, Flash = OXON Black, Kisan): the bull, "OXON • tagline",
// the sale's name, the big percentage in the look's accent and the tiles.
export function SaleHeaderPreview({
    theme: themeKey,
    name,
    subtitle,
    upToPercent,
    countdownLabel,
    countdownTarget,
    now = Date.now(),
    heroImage,
    compact = false,
}: {
    theme: SaleThemeKey | string
    name: string
    subtitle?: string
    upToPercent?: number | null
    // "Ends in" / "Starts in" / "Sale ended" (no tiles when ended).
    countdownLabel?: string
    countdownTarget?: string | Date | null
    now?: number
    heroImage?: string
    compact?: boolean
}) {
    const theme = saleTheme(themeKey)
    const title = name.trim() || "Sale name"
    const left = countdownTarget ? Math.max(0, new Date(countdownTarget).getTime() - now) : null
    const tiles = left === null || Number.isNaN(left)
        ? null
        : ([
            [Math.floor(left / 86_400_000), "Days"],
            [Math.floor(left / 3_600_000) % 24, "Hrs"],
            [Math.floor(left / 60_000) % 60, "Min"],
        ] as const)

    return (
        <div
            data-testid="sale-header-preview"
            data-theme={theme.key}
            className={`relative overflow-hidden ${compact ? "rounded-2xl" : "rounded-t-2xl rounded-b-[28px]"}`}
            style={{ backgroundImage: saleHeaderBackground(theme) }}
        >
            {heroImage ? (
                <div className="absolute inset-0 bg-cover bg-center opacity-[0.18]" style={{ backgroundImage: `url(${heroImage})` }} />
            ) : null}
            {/* The bull, large and faint: the logo's white square drops out. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                aria-hidden
                src="/oxon-bull.png"
                alt=""
                className="pointer-events-none absolute -right-10 -top-5 h-56 w-56 select-none"
                style={{ filter: "invert(1) grayscale(1)", mixBlendMode: "screen", opacity: 0.14 }}
            />
            <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ backgroundImage: `linear-gradient(to right, ${theme.accent}, transparent)` }}
            />

            <div className="relative px-4 pb-5 pt-5">
                <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/oxon-bull.png" alt="" className="h-6 w-6 rounded-md bg-white p-0.5" />
                    <span className="text-xs font-black tracking-[0.2em]" style={{ color: WHITE }}>OXON</span>
                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: theme.accent }} />
                    <span className="truncate text-[11px] font-extrabold" style={{ color: theme.accent }}>{theme.tagline}</span>
                </div>
                <p className={`${compact ? "text-xl" : "text-2xl"} mt-3 font-black leading-tight tracking-tight`} style={{ color: WHITE }}>
                    {title}
                </p>
                {subtitle ? <p className="mt-1 text-xs" style={{ color: "rgba(255, 255, 255, 0.7)" }}>{subtitle}</p> : null}

                <div className="mt-2 flex items-end gap-2">
                    {upToPercent ? (
                        <>
                            <span className="text-4xl font-black leading-none" style={{ color: theme.accent }}>{upToPercent}%</span>
                            <span className="pb-0.5 text-[11px] font-extrabold leading-tight" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                                {theme.key === "kisan" ? "FLAT" : "UP TO"}<br />OFF
                            </span>
                        </>
                    ) : (
                        <span className="text-xl font-black" style={{ color: theme.accent }}>Special prices</span>
                    )}
                </div>

                {countdownLabel ? (
                    <div className="mt-4 flex items-center gap-3">
                        <span className="text-[11px] font-bold" style={{ color: "rgba(255, 255, 255, 0.6)" }}>{countdownLabel}</span>
                        {tiles && countdownLabel !== "Sale ended" ? (
                            <div className="flex items-start gap-1.5">
                                {tiles.map(([value, unit]) => (
                                    <div key={unit} className="flex flex-col items-center">
                                        <span
                                            className="min-w-[34px] rounded-md px-1.5 py-1 text-center text-sm font-extrabold tabular-nums"
                                            style={{ color: theme.accent, backgroundColor: "rgba(255, 255, 255, 0.09)" }}
                                        >
                                            {String(value).padStart(2, "0")}
                                        </span>
                                        <span className="mt-0.5 text-[9px] font-bold" style={{ color: "rgba(255, 255, 255, 0.55)" }}>{unit}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = !mounted || resolvedTheme !== "light"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="admin-theme-toggle admin-nav-item flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors"
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Change color theme"}
      title={mounted ? `Switch to ${isDark ? "light" : "dark"} theme` : "Change color theme"}
    >
      <span className="flex items-center gap-3">
        {isDark ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
        <span>{mounted ? (isDark ? "Dark theme" : "Light theme") : "Theme"}</span>
      </span>
      <span className={`relative h-6 w-11 rounded-full border transition-colors ${isDark ? "border-[#3A3A3A] bg-[#242424]" : "border-[#B8C8DD] bg-[#DCE9FA]"}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-all ${isDark ? "left-0.5 bg-[#86efac]" : "left-[1.35rem] bg-[#4E78BE]"}`} />
      </span>
    </button>
  )
}

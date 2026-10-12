"use client"

import { useCallback, useEffect, useState } from "react"

export type ViewMode = "list" | "card"

// List is the default. A visitor's last choice is remembered per page.
export function useViewMode(pageKey: string): [ViewMode, (mode: ViewMode) => void] {
  const storageKey = `admin:viewMode:${pageKey}`
  const [mode, setMode] = useState<ViewMode>("list")

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved === "list" || saved === "card") setMode(saved)
    } catch {
      // Storage can be unavailable (private mode); keep the default.
    }
  }, [storageKey])

  const update = useCallback((next: ViewMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Ignore storage failures.
    }
  }, [storageKey])

  return [mode, update]
}

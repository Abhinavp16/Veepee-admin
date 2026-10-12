"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { logout } from "@/lib/api"

// Staff sessions end at a fixed time. This shows when, warns near the end and
// signs out at the end instead of leaving a dead page.
export function StaffSessionBanner() {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const stored = localStorage.getItem("sessionExpiresAt")
    const parsed = stored ? new Date(stored).getTime() : NaN
    setEndsAt(Number.isFinite(parsed) ? parsed : null)
    const timer = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (endsAt && now >= endsAt) void logout()
  }, [endsAt, now])

  if (!endsAt) return null
  const minutesLeft = Math.max(0, Math.ceil((endsAt - now) / 60000))
  const ending = minutesLeft <= 10
  const clock = new Date(endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${ending ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-[#333] bg-[#161616] text-[#919191]"}`}>
      <Clock className="h-3.5 w-3.5" />
      {ending ? `Your session ends in ${minutesLeft} min (${clock}). Save your work.` : `Staff session ends at ${clock}`}
    </div>
  )
}

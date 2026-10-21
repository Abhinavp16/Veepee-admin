"use client"

import { Header } from "@/components/header"
import { DashboardProvider, type DashboardUser } from "@/components/dashboard-context"
import { Sidebar } from "@/components/sidebar"
import { SessionBanner } from "@/components/session-banner"
import { apiFetch, endSession, logout } from "@/lib/api"
import { canAccessPath, type DashboardRole } from "@/lib/navigation"
import { Loader2, ShieldAlert, WifiOff } from "lucide-react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

function isDashboardRole(role: unknown): role is DashboardRole {
  return role === "admin" || role === "staff"
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  // The server could not be reached: the session is kept, with a Retry.
  const [unreachable, setUnreachable] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const verifyAuth = async () => {
      if (!localStorage.getItem("accessToken")) {
        router.replace("/login")
        return
      }
      setUnreachable(false)
      try {
        const response = await apiFetch("/auth/me")
        // Only a refused session signs out (an expired one already has).
        if (response.status === 401 || response.status === 403) {
          endSession()
          return
        }
        if (!response.ok) {
          setUnreachable(true)
          return
        }
        const payload = await response.json()
        const verifiedUser = payload?.data
        if (!verifiedUser || !isDashboardRole(verifiedUser.role)) {
          await logout()
          return
        }
        localStorage.setItem("user", JSON.stringify(verifiedUser))
        if (verifiedUser.mustChangePassword) {
          router.replace("/member/change-password")
          return
        }
        setUser(verifiedUser)
      } catch {
        setUnreachable(true)
      }
    }
    verifyAuth()
  }, [router, attempt])

  if (unreachable && !user) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black p-6 text-center text-white">
      <div className="rounded-full bg-amber-500/10 p-4 text-amber-400"><WifiOff className="h-8 w-8" /></div>
      <h1 className="text-xl font-bold">Can&apos;t reach the server</h1>
      <p className="max-w-sm text-sm text-[#919191]">Check your internet connection. You are still signed in.</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 rounded-lg bg-[#86efac] px-5 py-2 text-sm font-semibold text-black hover:bg-[#86efac]/90">Retry</button>
    </div>
  }
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-[#86efac]" /></div>

  const routeAllowed = canAccessPath(user.role, pathname)
  return <DashboardProvider value={user}>
    {/* `relative` on <main> keeps absolutely positioned helpers (such as the
        hidden checkbox inside each switch) in the scroll area, so the browser
        page itself never scrolls past the app. */}
    <div className="admin-page relative h-dvh overflow-hidden">
      <Header user={user} onMenuClick={() => setMobileOpen(true)} />
      <div className="flex h-full min-w-0 pt-16 md:pt-20">
        <Sidebar user={user} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 xl:p-9">
          <SessionBanner />
          {routeAllowed ? children : <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center"><div className="mb-5 rounded-full bg-red-500/10 p-4 text-red-400"><ShieldAlert className="h-8 w-8" /></div><h1 className="text-2xl font-bold">This area is restricted</h1><p className="mt-2 text-sm text-[#919191]">Your Staff account does not have access to this administrative control.</p></div>}
        </main>
      </div>
    </div>
  </DashboardProvider>
}

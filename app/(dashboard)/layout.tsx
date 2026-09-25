"use client"

import { Header } from "@/components/header"
import { DashboardProvider, type DashboardUser } from "@/components/dashboard-context"
import { Sidebar } from "@/components/sidebar"
import { apiFetch, logout } from "@/lib/api"
import { canAccessPath, type DashboardRole } from "@/lib/navigation"
import { ShieldAlert } from "lucide-react"
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

  useEffect(() => {
    const verifyAuth = async () => {
      if (!localStorage.getItem("accessToken")) {
        router.replace("/login")
        return
      }
      try {
        const response = await apiFetch("/auth/me")
        const payload = await response.json()
        const verifiedUser = payload?.data
        if (!response.ok || !verifiedUser || !isDashboardRole(verifiedUser.role)) {
          await logout()
          return
        }
        localStorage.setItem("user", JSON.stringify(verifiedUser))
        setUser(verifiedUser)
      } catch {
        await logout()
      }
    }
    verifyAuth()
  }, [router])

  if (!user) return null

  const routeAllowed = canAccessPath(user.role, pathname)
  return <DashboardProvider value={user}>
    <div className="h-dvh overflow-hidden bg-black text-white">
      <Header user={user} onMenuClick={() => setMobileOpen(true)} />
      <div className="flex h-full min-w-0 pt-16 md:pt-20">
        <Sidebar user={user} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-7 xl:p-8">
          {routeAllowed ? children : <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center"><div className="mb-5 rounded-full bg-red-500/10 p-4 text-red-400"><ShieldAlert className="h-8 w-8" /></div><h1 className="text-2xl font-bold">This area is restricted</h1><p className="mt-2 text-sm text-[#919191]">Your Staff account does not have access to this administrative control.</p></div>}
        </main>
      </div>
    </div>
  </DashboardProvider>
}

"use client"

import { ChevronDown, ChevronRight, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import type { DashboardUser } from "@/components/dashboard-context"
import { VeepeeBrand } from "@/components/veepee-brand"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { logout } from "@/lib/api"
import { navigationGroups, type NavigationItem } from "@/lib/navigation"

interface SidebarProps {
  user: DashboardUser
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

function isActive(pathname: string, href?: string) {
  return Boolean(href && (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)))
}

function Navigation({ user, onNavigate }: Pick<SidebarProps, "user"> & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(() => pathname.startsWith("/offers"))
  const visibleGroups = navigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length)

  const renderItem = (item: NavigationItem) => {
    const Icon = item.icon
    const children = item.children?.filter((child) => child.roles.includes(user.role)) ?? []
    const active = isActive(pathname, item.href) || children.some((child) => isActive(pathname, child.href))

    if (children.length) {
      return <div key={item.label} className="space-y-1">
        <button onClick={() => setExpanded((value) => !value)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active ? "bg-[#86efac]/10 text-[#86efac]" : "text-[#919191] hover:bg-white/5 hover:text-white"}`}>
          <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{item.label}</span>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {expanded && <div className="ml-5 border-l border-[#333] pl-3">{children.map((child) => {
          const ChildIcon = child.icon
          return <Link key={child.href} href={child.href!} onClick={onNavigate} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isActive(pathname, child.href) ? "text-[#86efac]" : "text-[#919191] hover:text-white"}`}><ChildIcon className="h-3.5 w-3.5" />{child.label}</Link>
        })}</div>}
      </div>
    }

    return <Link key={item.href} href={item.href!} onClick={onNavigate} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[#86efac]/10 text-[#86efac]" : "text-[#919191] hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</Link>
  }

  return <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">{visibleGroups.map((group) => <section key={group.label} className="mb-6"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#666]">{group.label}</p><div className="space-y-1">{group.items.map(renderItem)}</div></section>)}</nav>
}

function UtilityArea({ user, onNavigate }: Pick<SidebarProps, "user"> & { onNavigate?: () => void }) {
  const isAdmin = user.role === "admin"
  return <div className="shrink-0 border-t border-[#1F1F1F] p-3"><div className="space-y-1">{isAdmin && <Link href="/settings" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#919191] transition-colors hover:bg-white/5 hover:text-white"><Settings className="h-4 w-4" />Settings</Link>}<button onClick={async () => { toast.success("Logged out successfully"); await logout() }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#919191] transition-colors hover:bg-red-500/10 hover:text-red-400"><LogOut className="h-4 w-4" />Logout</button></div></div>
}

function SidebarPanel({ user, onNavigate, showBrand = false }: Pick<SidebarProps, "user"> & { onNavigate?: () => void; showBrand?: boolean }) {
  return <div className="flex h-full min-h-0 flex-col bg-[#0D0D0D]">{showBrand && <div className="shrink-0 border-b border-[#1F1F1F] px-5 py-4"><VeepeeBrand /></div>}<Navigation user={user} onNavigate={onNavigate} /><UtilityArea user={user} onNavigate={onNavigate} /></div>
}

export function Sidebar({ user, mobileOpen, onMobileOpenChange }: SidebarProps) {
  return <>
    <aside className="hidden h-full min-h-0 md:flex md:w-60 lg:w-64"><SidebarPanel user={user} showBrand /></aside>
    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-[20rem] border-[#333] bg-[#0D0D0D] p-0 text-white">
        <SheetHeader className="sr-only"><SheetTitle>Veepee navigation</SheetTitle></SheetHeader>
        <SidebarPanel user={user} showBrand onNavigate={() => onMobileOpenChange(false)} />
      </SheetContent>
    </Sheet>
  </>
}

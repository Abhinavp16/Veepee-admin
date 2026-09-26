"use client"

import { ChevronDown, ChevronRight, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import type { DashboardUser } from "@/components/dashboard-context"
import { VeepeeBrand } from "@/components/veepee-brand"
import { ThemeToggle } from "@/components/theme-toggle"
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
        <button onClick={() => setExpanded((value) => !value)} className={`admin-nav-item flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${active ? "admin-nav-item-active" : "admin-nav-item-inactive"}`}>
          <span className="flex items-center gap-3"><Icon className="h-[17px] w-[17px] shrink-0" />{item.label}</span>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {expanded && <div className="ml-5 border-l border-[var(--admin-border)] pl-3">{children.map((child) => {
          const ChildIcon = child.icon
          return <Link key={child.href} href={child.href!} onClick={onNavigate} className={`admin-nav-child flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isActive(pathname, child.href) ? "admin-nav-child-active" : ""}`}><ChildIcon className="h-4 w-4 shrink-0" />{child.label}</Link>
        })}</div>}
      </div>
    }

    return <Link key={item.href} href={item.href!} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`admin-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? "admin-nav-item-active" : "admin-nav-item-inactive"}`}><Icon className="h-[17px] w-[17px] shrink-0" />{item.label}</Link>
  }

  return <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">{visibleGroups.map((group) => <section key={group.label} className="mb-6"><p className="admin-nav-group mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em]">{group.label}</p><div className="space-y-0.5">{group.items.map(renderItem)}</div></section>)}</nav>
}

function UtilityArea({ user, onNavigate }: Pick<SidebarProps, "user"> & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const isAdmin = user.role === "admin"
  return <div className="admin-utility-area shrink-0 border-t p-3"><div className="space-y-0.5"><ThemeToggle />{isAdmin && <Link href="/settings" onClick={onNavigate} className={`admin-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${pathname === "/settings" ? "admin-nav-item-active" : "admin-nav-item-inactive"}`}><Settings className="h-[17px] w-[17px]" />Settings</Link>}<button onClick={async () => { toast.success("Logged out successfully"); await logout() }} className="admin-nav-item admin-nav-item-inactive flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors hover:!bg-red-500/10 hover:!text-red-500"><LogOut className="h-[17px] w-[17px]" />Logout</button></div></div>
}

function SidebarPanel({ user, onNavigate, showBrand = false }: Pick<SidebarProps, "user"> & { onNavigate?: () => void; showBrand?: boolean }) {
  return <div className="admin-sidebar flex h-full min-h-0 flex-col">{showBrand && <div className="admin-sidebar-brand shrink-0 border-b px-5 py-5"><VeepeeBrand /></div>}<Navigation user={user} onNavigate={onNavigate} /><UtilityArea user={user} onNavigate={onNavigate} /></div>
}

export function Sidebar({ user, mobileOpen, onMobileOpenChange }: SidebarProps) {
  return <>
    <aside className="hidden h-full min-h-0 shrink-0 border-r border-[var(--admin-border)] md:flex md:w-64 xl:w-[17rem]"><SidebarPanel user={user} showBrand /></aside>
    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side="left" className="w-[88vw] max-w-[22rem] border-[#333] bg-[#0D0D0D] p-0 text-white">
        <SheetHeader className="sr-only"><SheetTitle>Veepee navigation</SheetTitle></SheetHeader>
        <SidebarPanel user={user} showBrand onNavigate={() => onMobileOpenChange(false)} />
      </SheetContent>
    </Sheet>
  </>
}

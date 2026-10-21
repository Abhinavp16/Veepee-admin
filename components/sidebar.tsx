"use client"

import { ChevronDown, ChevronRight, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
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

// On laptops (lg to xl) the docked sidebar is an icon rail: labels hide and
// each item keeps its name as a tooltip. The ☰ button opens the full menu.
const RAIL_LABEL = "lg:max-xl:sr-only"

function Navigation({ user, onNavigate, rail = false }: Pick<SidebarProps, "user"> & { onNavigate?: () => void; rail?: boolean }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(() => pathname.startsWith("/offers"))
  const navRef = useRef<HTMLElement>(null)
  const label = rail ? RAIL_LABEL : ""

  // The current page stays visible in a long menu.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" })
  }, [pathname])
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
        <button onClick={() => setExpanded((value) => !value)} title={item.label} aria-expanded={expanded} className={`admin-nav-item flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] font-semibold transition-colors ${rail ? "lg:max-xl:justify-center lg:max-xl:px-0" : ""} ${active ? "admin-nav-item-active" : "admin-nav-item-inactive"}`}>
          <span className="flex items-center gap-3"><Icon className="h-[17px] w-[17px] shrink-0" /><span className={label}>{item.label}</span></span>
          <span className={label}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        </button>
        {expanded && <div className={`ml-5 border-l border-[var(--admin-border)] pl-3 ${rail ? "lg:max-xl:ml-0 lg:max-xl:border-l-0 lg:max-xl:pl-0" : ""}`}>{children.map((child) => {
          const ChildIcon = child.icon
          const childActive = isActive(pathname, child.href)
          return <Link key={child.href} href={child.href!} onClick={onNavigate} title={child.label} aria-current={childActive ? "page" : undefined} className={`admin-nav-child flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${rail ? "lg:max-xl:justify-center lg:max-xl:px-0" : ""} ${childActive ? "admin-nav-child-active" : ""}`}><ChildIcon className="h-4 w-4 shrink-0" /><span className={label}>{child.label}</span></Link>
        })}</div>}
      </div>
    }

    return <Link key={item.href} href={item.href!} onClick={onNavigate} title={item.label} aria-current={active ? "page" : undefined} className={`admin-nav-item flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${rail ? "lg:max-xl:justify-center lg:max-xl:px-0" : ""} ${active ? "admin-nav-item-active" : "admin-nav-item-inactive"}`}><Icon className="h-[17px] w-[17px] shrink-0" /><span className={label}>{item.label}</span></Link>
  }

  return <nav ref={navRef} className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 ${rail ? "lg:max-xl:px-2" : ""}`}>{visibleGroups.map((group) => <section key={group.label} className="mb-3"><p className={`admin-nav-group mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] ${label}`}>{group.label}</p><div className="space-y-0.5">{group.items.map(renderItem)}</div></section>)}</nav>
}

function UtilityArea({ user, onNavigate, rail = false }: Pick<SidebarProps, "user"> & { onNavigate?: () => void; rail?: boolean }) {
  const pathname = usePathname()
  const isAdmin = user.role === "admin"
  const label = rail ? RAIL_LABEL : ""
  const center = rail ? "lg:max-xl:justify-center lg:max-xl:px-0" : ""
  return <div className={`admin-utility-area shrink-0 border-t p-3 ${rail ? "lg:max-xl:p-2" : ""}`}><div className="space-y-0.5"><div className={rail ? "lg:max-xl:hidden" : ""}><ThemeToggle /></div>{isAdmin && <Link href="/settings" onClick={onNavigate} title="Settings" className={`admin-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${center} ${pathname === "/settings" ? "admin-nav-item-active" : "admin-nav-item-inactive"}`}><Settings className="h-[17px] w-[17px] shrink-0" /><span className={label}>Settings</span></Link>}<button onClick={async () => { toast.success("Logged out successfully"); await logout() }} title="Logout" className={`admin-nav-item admin-nav-item-inactive flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors hover:!bg-red-500/10 hover:!text-red-500 ${center}`}><LogOut className="h-[17px] w-[17px] shrink-0" /><span className={label}>Logout</span></button></div></div>
}

function SidebarPanel({ user, onNavigate, showBrand = false, rail = false }: Pick<SidebarProps, "user"> & { onNavigate?: () => void; showBrand?: boolean; rail?: boolean }) {
  return <div className="admin-sidebar flex h-full min-h-0 flex-col">{showBrand && <div className="admin-sidebar-brand shrink-0 border-b px-5 py-5"><VeepeeBrand /></div>}<Navigation user={user} onNavigate={onNavigate} rail={rail} /><UtilityArea user={user} onNavigate={onNavigate} rail={rail} /></div>
}

export function Sidebar({ user, mobileOpen, onMobileOpenChange }: SidebarProps) {
  return <>
    <aside className="hidden h-full min-h-0 shrink-0 border-r border-[var(--admin-border)] lg:flex lg:w-16 xl:w-[17rem]"><SidebarPanel user={user} rail /></aside>
    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side="left" className="w-[88vw] max-w-[22rem] border-[#333] bg-[#0D0D0D] p-0 text-white">
        <SheetHeader className="sr-only"><SheetTitle>Veepee navigation</SheetTitle></SheetHeader>
        <SidebarPanel user={user} showBrand onNavigate={() => onMobileOpenChange(false)} />
      </SheetContent>
    </Sheet>
  </>
}

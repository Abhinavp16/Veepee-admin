"use client"

import { LogOut, Menu, Settings2 } from "lucide-react"
import Link from "next/link"
import type { DashboardUser } from "@/components/dashboard-context"
import { VeepeeBrand } from "@/components/veepee-brand"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { logout } from "@/lib/api"
import { roleLabel } from "@/lib/navigation"

interface HeaderProps {
  user: DashboardUser
  onMenuClick: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  return <header className="admin-header fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b px-4 backdrop-blur md:h-20 md:px-6">
    <div className="flex items-center gap-3">
      <button type="button" onClick={onMenuClick} className="rounded-lg p-2 text-[#919191] hover:bg-white/5 hover:text-white md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      <VeepeeBrand />
      <span className="hidden border-l border-[#333] pl-3 text-sm text-[#919191] sm:inline">Admin</span>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="admin-profile-button flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 transition-colors focus:outline-none focus:ring-2 focus:ring-[#86efac]/50">
          <Avatar className="h-8 w-8 border border-[#333]"><AvatarImage src={user.avatar || undefined} /><AvatarFallback className="bg-[#86efac] text-xs font-bold text-black">{user.name?.charAt(0).toUpperCase() || "V"}</AvatarFallback></Avatar>
          <span className="hidden text-left sm:block"><span className="block max-w-28 truncate text-xs font-bold text-white">{user.name}</span><span className="block text-[10px] font-medium uppercase tracking-wider text-[#919191]">{roleLabel(user.role)}</span></span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-[#1F1F1F] bg-[#0D0D0D] p-2 text-white">
        <DropdownMenuLabel className="border-b border-[#1F1F1F] px-3 pb-3 font-normal"><p className="text-sm font-bold">{user.name}</p><p className="truncate text-xs text-[#919191]">{user.email || ""}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#86efac]">{roleLabel(user.role)}</p></DropdownMenuLabel>
        {user.role === "admin" && <Link href="/settings"><DropdownMenuItem className="mt-2 cursor-pointer rounded-lg py-2 focus:bg-[#1A1A1A] focus:text-[#86efac]"><Settings2 className="mr-3 h-4 w-4" />Account Settings</DropdownMenuItem></Link>}
        <DropdownMenuSeparator className="my-2 bg-[#1F1F1F]" />
        <DropdownMenuItem onClick={async () => { await logout() }} className="cursor-pointer rounded-lg py-2 focus:bg-red-500/10 focus:text-red-400"><LogOut className="mr-3 h-4 w-4" />Logout session</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </header>
}

"use client"

import { FinbroLogo } from "@/components/finbro-logo"
import { Settings2, LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { getUser, logout } from "@/lib/api"
import Link from "next/link"

export function Header() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getUser())
    const handleStorage = () => setUser(getUser())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-black/10 backdrop-blur-[120px]">
      <div className="text-white text-xl font-bold tracking-tight pl-4 flex items-center gap-2">
        <div className="h-8 w-8 bg-[#86efac] rounded-lg flex items-center justify-center">
          <span className="text-black font-black text-xs">V</span>
        </div>
        AgriMart <span className="text-[#86efac]">Admin</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 bg-[#0D0D0D] border border-[#333] pl-2 pr-4 py-1.5 rounded-full hover:bg-[#1A1A1A] transition-colors focus:outline-none ring-offset-black focus:ring-2 focus:ring-[#86efac]/50 group">
            <Avatar className="h-8 w-8 border border-[#333] group-hover:border-[#86efac]/30 transition-colors">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-[#86efac] to-[#4ade80] text-black text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start translate-y-[1px]">
              <span className="text-xs font-bold text-white line-clamp-1">{user?.name || 'Admin'}</span>
              <span className="text-[10px] text-[#919191] font-medium uppercase tracking-wider">Super Admin</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[#0D0D0D] border-[#1F1F1F] text-white p-2">
          <DropdownMenuLabel className="font-normal border-b border-[#1F1F1F] pb-3 mb-2 px-3">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-bold leading-none text-white">{user?.name || 'Administrator'}</p>
              <p className="text-xs leading-none text-[#919191] truncate">{user?.email || 'admin@agrimart.com'}</p>
            </div>
          </DropdownMenuLabel>
          <Link href="/settings">
            <DropdownMenuItem className="focus:bg-[#1A1A1A] focus:text-[#86efac] rounded-lg cursor-pointer py-2 px-3 group">
              <Settings2 className="mr-3 h-4 w-4 text-[#919191] group-focus:text-[#86efac]" />
              <span className="text-sm font-medium">Account Settings</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator className="bg-[#1F1F1F] my-2" />
          <DropdownMenuItem
            onClick={() => logout()}
            className="focus:bg-red-500/10 focus:text-red-400 rounded-lg cursor-pointer py-2 px-3 group"
          >
            <LogOut className="mr-3 h-4 w-4 text-[#919191] group-focus:text-red-400" />
            <span className="text-sm font-medium">Logout Session</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

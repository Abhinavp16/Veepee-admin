"use client"

import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquareMore, BarChart3, Settings, LogOut, Building2, FolderTree, UserSearch, Image, TicketPercent, ChevronDown, ChevronRight, User, Store, BadgeCheck, Star, Globe, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState } from 'react'

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [offersOpen, setOffersOpen] = useState(pathname.startsWith('/offers'));

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path ? "text-[#E7E7E7]" : "text-[#919191] hover:text-[#E7E7E7]";

  return (
    <aside className="sticky top-24 h-[calc(100vh-8rem)] md:w-48 lg:w-64 bg-[#0D0D0D] rounded-2xl hidden md:flex flex-col p-8 overflow-y-auto">
      <nav className="flex flex-col gap-8">
        <Link href="/" className={`flex items-center gap-4 transition-colors ${isActive('/')}`}>
          <LayoutDashboard className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">DASHBOARD</span>
        </Link>
        <Link href="/products" className={`flex items-center gap-4 transition-colors ${isActive('/products')}`}>
          <Package className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">PRODUCTS</span>
        </Link>
        <Link href="/brands" className={`flex items-center gap-4 transition-colors ${isActive('/brands')}`}>
          <Building2 className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">BRANDS</span>
        </Link>
        <Link href="/categories" className={`flex items-center gap-4 transition-colors ${isActive('/categories')}`}>
          <FolderTree className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">CATEGORIES</span>
        </Link>
        <Link href="/labels" className={`flex items-center gap-4 transition-colors ${isActive('/labels')}`}>
          <BadgeCheck className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">LABELS</span>
        </Link>
        <Link href="/orders" className={`flex items-center gap-4 transition-colors ${isActive('/orders')}`}>
          <ShoppingCart className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">ORDERS</span>
        </Link>
        <Link href="/negotiations" className={`flex items-center gap-4 transition-colors ${isActive('/negotiations')}`}>
          <MessageSquareMore className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">NEGOTIATIONS</span>
        </Link>
        <Link href="/customers" className={`flex items-center gap-4 transition-colors ${isActive('/customers')}`}>
          <Users className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">CUSTOMERS</span>
        </Link>
        <Link href="/account-upgrades" className={`flex items-center gap-4 transition-colors ${isActive('/account-upgrades')}`}>
          <UserPlus className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">ACCOUNT UPGRADES</span>
        </Link>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => setOffersOpen(!offersOpen)}
            className={`flex items-center justify-between w-full transition-colors ${pathname.startsWith('/offers') ? "text-[#E7E7E7]" : "text-[#919191] hover:text-[#E7E7E7]"}`}
          >
            <div className="flex items-center gap-4">
              <TicketPercent className="h-6 w-6" />
              <span className="text-sm font-medium tracking-wide">OFFERS</span>
            </div>
            {offersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {offersOpen && (
            <div className="ml-6 flex flex-col gap-5 mt-2 transition-all duration-300">
              <Link href="/offers/customers" className={`text-xs font-medium tracking-wide transition-colors flex items-center gap-3 ${isActive('/offers/customers')}`}>
                <User className="h-4 w-4" />
                CUSTOMERS
              </Link>
              <Link href="/offers/wholesalers" className={`text-xs font-medium tracking-wide transition-colors flex items-center gap-3 ${isActive('/offers/wholesalers')}`}>
                <Store className="h-4 w-4" />
                WHOLESALERS
              </Link>
              <Link href="/offers/affiliates" className={`text-xs font-medium tracking-wide transition-colors flex items-center gap-3 ${isActive('/offers/affiliates')}`}>
                <BadgeCheck className="h-4 w-4" />
                AFFILIATE CODES
              </Link>
            </div>
          )}
        </div>

        <Link href="/analytics" className={`flex items-center gap-4 transition-colors ${isActive('/analytics')}`}>
          <BarChart3 className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">ANALYTICS</span>
        </Link>
        <Link href="/potential-customers" className={`flex items-center gap-4 transition-colors ${isActive('/potential-customers')}`}>
          <UserSearch className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">LEADS</span>
        </Link>
        <Link href="/banners" className={`flex items-center gap-4 transition-colors ${isActive('/banners')}`}>
          <Image className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">BANNERS</span>
        </Link>
        <Link href="/manage-website" className={`flex items-center gap-4 transition-colors ${isActive('/manage-website')}`}>
          <Globe className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">MANAGE WEBSITE</span>
        </Link>
        <Link href="/reviews" className={`flex items-center gap-4 transition-colors ${isActive('/reviews')}`}>
          <Star className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">REVIEWS</span>
        </Link>
      </nav>

      <div className="mt-auto pt-8 border-t border-[#1F1F1F] flex flex-col gap-8">
        <Link href="/settings" className="flex items-center gap-4 text-[#919191] hover:text-[#E7E7E7] transition-colors cursor-pointer">
          <Settings className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">SETTINGS</span>
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-4 text-[#919191] hover:text-red-400 transition-colors cursor-pointer">
          <LogOut className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">LOGOUT</span>
        </button>
      </div>
    </aside>
  )
}

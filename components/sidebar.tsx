"use client"

import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquareMore, BarChart3, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
        <Link href="/analytics" className={`flex items-center gap-4 transition-colors ${isActive('/analytics')}`}>
          <BarChart3 className="h-6 w-6" />
          <span className="text-sm font-medium tracking-wide">ANALYTICS</span>
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

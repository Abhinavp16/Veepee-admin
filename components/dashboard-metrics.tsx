"use client"

import { useEffect, useState } from 'react'
import { Wallet, ShoppingCart, Users, Handshake, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DashboardData {
  overview: {
    totalOrders: number
    pendingPayments: number
    totalRevenue: number
    activeNegotiations: number
    totalProducts: number
    totalCustomers: number
  }
  today: { orders: number; revenue: number }
  thisMonth: { orders: number; revenue: number }
}

export function DashboardMetrics() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('http://localhost:5000/api/v1/admin/analytics/dashboard', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
        const json = await res.json()
        if (res.ok && json.success) {
          setData(json.data)
        }
      } catch {
        toast.error('Failed to load dashboard stats')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-[#0D0D0D] rounded-2xl h-28">
        <Loader2 className="h-6 w-6 animate-spin text-[#86efac]" />
      </div>
    )
  }

  const overview = data?.overview
  const today = data?.today

  return (
    <div className="flex flex-col xl:flex-row gap-8 xl:items-center justify-between p-6 bg-[#0D0D0D] rounded-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-400">
          <Wallet className="h-5 w-5" />
          <span className="text-lg">Total Revenue</span>
        </div>
        <div className="text-5xl md:text-4xl lg:text-5xl font-bold text-white">{formatCurrency(overview?.totalRevenue ?? 0)}</div>
        {today && today.revenue > 0 && (
          <span className="text-xs text-[#86efac]">+{formatCurrency(today.revenue)} today</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 xl:gap-16">
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Total Orders</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-white">{(overview?.totalOrders ?? 0).toLocaleString()}</span>
          {today && today.orders > 0 && (
            <span className="text-xs text-[#86efac]">+{today.orders} today</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Customers</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-[#86efac]">{(overview?.totalCustomers ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm flex items-center gap-2"><Handshake className="w-4 h-4" /> Negotiations</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-[#fbbf24]">{overview?.activeNegotiations ?? 0}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Pending Payments</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-orange-400">{overview?.pendingPayments ?? 0}</span>
        </div>
      </div>
    </div>
  )
}

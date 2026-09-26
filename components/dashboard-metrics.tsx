"use client"

import { useEffect, useRef, useState } from 'react'
import { Wallet, ShoppingCart, Users, Handshake, Loader2, ReceiptIndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

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
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetchStats() {
      try {
        const res = await apiFetch('/admin/analytics/dashboard')
        const contentType = res.headers.get('content-type') || ''

        if (!contentType.includes('application/json')) {
          throw new Error(`Unexpected API response (${res.status})`)
        }

        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json?.message || `Failed to load dashboard stats (${res.status})`)
        }

        setData(json.data)
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load dashboard stats')
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
      <div className="flex h-36 items-center justify-center rounded-2xl border border-[#242724] bg-[#101210] p-6 shadow-[0_16px_45px_rgba(0,0,0,0.24)]">
        <Loader2 className="h-6 w-6 animate-spin text-[#86efac]" />
      </div>
    )
  }

  const overview = data?.overview
  const today = data?.today

  return (
    <section className="grid gap-4 xl:grid-cols-[1.35fr_2fr]" aria-label="Dashboard overview">
      <div className="admin-revenue-card relative overflow-hidden rounded-2xl border p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#86efac]/10 blur-3xl" />
        <div className="relative flex h-full min-h-36 flex-col justify-between gap-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[#B7C0B9]">
              <span className="rounded-lg border border-[#86efac]/15 bg-[#86efac]/10 p-2 text-[#86efac]"><Wallet className="h-5 w-5" /></span>
              <span className="text-sm font-medium uppercase tracking-[0.12em]">Total Revenue</span>
            </div>
            <span className="rounded-full border border-[#86efac]/15 bg-[#86efac]/5 px-3 py-1 text-[11px] font-medium text-[#86efac]">Paid orders</span>
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{formatCurrency(overview?.totalRevenue ?? 0)}</div>
            <p className="mt-2 text-sm text-[#7F8982]">Verified revenue across the marketplace</p>
            {today && today.revenue > 0 && <span className="mt-3 inline-block text-xs font-medium text-[#86efac]">+{formatCurrency(today.revenue)} today</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="admin-card rounded-2xl border p-5 transition-colors hover:border-[#343934]">
          <span className="flex items-center gap-2 text-sm text-[#929A94]"><ShoppingCart className="h-4 w-4 text-white" /> Total Orders</span>
          <span className="mt-4 block text-3xl font-semibold text-white">{(overview?.totalOrders ?? 0).toLocaleString()}</span>
          <span className="mt-1 block min-h-4 text-xs text-[#86efac]">{today && today.orders > 0 ? `+${today.orders} today` : "All recorded orders"}</span>
        </div>
        <div className="admin-card rounded-2xl border p-5 transition-colors hover:border-[#343934]">
          <span className="flex items-center gap-2 text-sm text-[#929A94]"><Users className="h-4 w-4 text-[#86efac]" /> Customers</span>
          <span className="mt-4 block text-3xl font-semibold text-[#86efac]">{(overview?.totalCustomers ?? 0).toLocaleString()}</span>
          <span className="mt-1 block text-xs text-[#68706A]">Active buyer accounts</span>
        </div>
        <div className="admin-card rounded-2xl border p-5 transition-colors hover:border-[#343934]">
          <span className="flex items-center gap-2 text-sm text-[#929A94]"><Handshake className="h-4 w-4 text-[#fbbf24]" /> Negotiations</span>
          <span className="mt-4 block text-3xl font-semibold text-[#fbbf24]">{overview?.activeNegotiations ?? 0}</span>
          <span className="mt-1 block text-xs text-[#68706A]">Awaiting resolution</span>
        </div>
        <div className="admin-card rounded-2xl border p-5 transition-colors hover:border-[#493B27]">
          <span className="flex items-center gap-2 text-sm text-[#929A94]"><ReceiptIndianRupee className="h-4 w-4 text-orange-400" /> Pending Payments</span>
          <span className="mt-4 block text-3xl font-semibold text-orange-400">{overview?.pendingPayments ?? 0}</span>
          <span className="mt-1 block text-xs text-[#746A5C]">Needs verification</span>
        </div>
      </div>
    </section>
  )
}

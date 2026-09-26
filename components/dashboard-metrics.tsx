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
      <div className="admin-card flex h-44 items-center justify-center rounded-[1.4rem] border p-6">
        <Loader2 className="dashboard-accent h-6 w-6 animate-spin" />
      </div>
    )
  }

  const overview = data?.overview
  const today = data?.today

  return (
    <section className="admin-card rounded-[1.4rem] border p-5 sm:p-6" aria-label="Dashboard overview">
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2.25fr)] lg:gap-6">
        <div className="flex min-h-40 flex-col justify-between border-b border-[var(--admin-border)] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <div className="flex items-center gap-3">
            <span className="dashboard-icon dashboard-icon-primary"><Wallet className="h-[18px] w-[18px]" /></span>
            <span className="admin-muted text-sm font-medium">Total revenue</span>
          </div>
          <div className="mt-8">
            <div className="admin-heading text-4xl font-bold tracking-[-0.04em]">{formatCurrency(overview?.totalRevenue ?? 0)}</div>
            <p className="admin-muted mt-2 text-sm">Verified paid order revenue</p>
            {today && today.revenue > 0 && <span className="dashboard-positive mt-2 inline-block text-xs font-semibold">+{formatCurrency(today.revenue)} today</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="admin-card-muted dashboard-stat-card rounded-2xl border p-4">
            <span className="dashboard-icon dashboard-icon-primary"><ShoppingCart className="h-4 w-4" /></span>
            <span className="admin-muted mt-4 block text-xs font-medium">Total orders</span>
            <span className="admin-heading mt-1 block text-2xl font-bold">{(overview?.totalOrders ?? 0).toLocaleString()}</span>
            <span className="admin-muted mt-1 block min-h-4 text-[11px]">{today && today.orders > 0 ? `+${today.orders} today` : "All time"}</span>
          </div>
          <div className="admin-card-muted dashboard-stat-card rounded-2xl border p-4">
            <span className="dashboard-icon dashboard-icon-cyan"><Users className="h-4 w-4" /></span>
            <span className="admin-muted mt-4 block text-xs font-medium">Customers</span>
            <span className="dashboard-accent mt-1 block text-2xl font-bold">{(overview?.totalCustomers ?? 0).toLocaleString()}</span>
            <span className="admin-muted mt-1 block text-[11px]">Registered buyers</span>
          </div>
          <div className="admin-card-muted dashboard-stat-card rounded-2xl border p-4">
            <span className="dashboard-icon dashboard-icon-amber"><Handshake className="h-4 w-4" /></span>
            <span className="admin-muted mt-4 block text-xs font-medium">Negotiations</span>
            <span className="mt-1 block text-2xl font-bold text-amber-500">{overview?.activeNegotiations ?? 0}</span>
            <span className="admin-muted mt-1 block text-[11px]">Awaiting resolution</span>
          </div>
          <div className="admin-card-muted dashboard-stat-card rounded-2xl border p-4">
            <span className="dashboard-icon dashboard-icon-orange"><ReceiptIndianRupee className="h-4 w-4" /></span>
            <span className="admin-muted mt-4 block text-xs font-medium">Pending payments</span>
            <span className="mt-1 block text-2xl font-bold text-orange-500">{overview?.pendingPayments ?? 0}</span>
            <span className="admin-muted mt-1 block text-[11px]">Needs attention</span>
          </div>
        </div>
      </div>
    </section>
  )
}

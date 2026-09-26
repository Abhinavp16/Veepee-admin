"use client"

import { DashboardMetrics } from "@/components/dashboard-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { RecentOrders } from "@/components/recent-orders"
import { useDashboardUser } from "@/components/dashboard-context"

export default function Dashboard() {
  const user = useDashboardUser()
  const isAdmin = user?.role === "admin"

  return <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#86efac]">Operations overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Dashboard</h1><p className="admin-muted mt-1 text-sm">Monitor revenue, orders, customers, and marketplace activity.</p></div>
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#284132] bg-[#86efac]/5 px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-[#86efac] shadow-[0_0_10px_rgba(134,239,172,0.7)]" /><span className="text-xs font-medium text-[#A7F3C1]">System online</span></div>
    </div>
    <DashboardMetrics />
    {isAdmin && <PerformanceChart />}
    <RecentOrders />
  </div>
}

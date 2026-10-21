"use client"

import { DashboardMetrics } from "@/components/dashboard-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { RecentOrders } from "@/components/recent-orders"
import { useDashboardUser } from "@/components/dashboard-context"

export default function Dashboard() {
  const user = useDashboardUser()
  const isAdmin = user?.role === "admin"

  return <div className="mx-auto max-w-[1680px] space-y-7 pb-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="dashboard-eyebrow">Command center</p><h1 className="admin-heading mt-1.5 text-3xl font-bold tracking-[-0.03em] sm:text-[2rem]">Business overview</h1><p className="admin-muted mt-1.5 text-sm">{isAdmin ? "Monitor revenue, customer activity, and orders from one place." : "Orders, customers and negotiations at a glance."}</p></div>
    </div>
    <DashboardMetrics />
    <div className={`grid items-stretch gap-6 ${isAdmin ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(390px,0.95fr)]" : ""}`}>
      {isAdmin && <PerformanceChart />}
      <RecentOrders />
    </div>
  </div>
}

"use client"

import { DashboardMetrics } from "@/components/dashboard-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { RecentOrders } from "@/components/recent-orders"
import { useDashboardUser } from "@/components/dashboard-context"

export default function Dashboard() {
  const user = useDashboardUser()
  const isAdmin = user?.role === "admin"

  return <><DashboardMetrics />{isAdmin && <PerformanceChart />}<RecentOrders /><div className="mt-4 flex items-center justify-end gap-2"><div className="h-[13px] w-[13px] rounded-full bg-[#86efac]" /><span className="text-sm text-[#919191]">System Online</span></div></>
}

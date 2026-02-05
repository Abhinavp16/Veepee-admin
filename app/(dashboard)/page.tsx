import { DashboardMetrics } from "@/components/dashboard-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { RecentOrders } from "@/components/recent-orders"

export default function Dashboard() {
    return (
        <>
            <DashboardMetrics />
            <PerformanceChart />
            <RecentOrders />

            {/* Status Indicator */}
            <div className="flex items-center justify-end gap-2 mt-4">
                <div className="w-[13px] h-[13px] rounded-full bg-[#86efac]" />
                <span className="text-sm text-[#919191]">System Online</span>
            </div>
        </>
    )
}

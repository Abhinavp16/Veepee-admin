import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/table-skeleton"

// Shown while a dashboard page loads, so navigation feels immediate.
export default function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64 bg-[#262626]" />
                <Skeleton className="h-4 w-96 max-w-full bg-[#1F1F1F]" />
            </div>
            <div className="rounded-xl border border-[#333] bg-[#161616]">
                <TableSkeleton />
            </div>
        </div>
    )
}

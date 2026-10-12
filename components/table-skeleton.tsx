import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder rows shown while a list loads; keeps the page from jumping. */
export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="space-y-3 p-4" role="status" aria-label="Loading">
            <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, column) => (
                    <Skeleton key={column} className="h-4 flex-1 bg-[#262626]" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, row) => (
                <div key={row} className="flex items-center gap-4">
                    {Array.from({ length: columns }).map((_, column) => (
                        <Skeleton key={column} className={`h-9 flex-1 bg-[#1F1F1F] ${column === 0 ? "max-w-[3.5rem]" : ""}`} />
                    ))}
                </div>
            ))}
        </div>
    )
}

/** Card-shaped placeholders for grid views. */
export function CardGridSkeleton({ cards = 8 }: { cards?: number }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Loading">
            {Array.from({ length: cards }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-[#333] bg-[#161616] p-4">
                    <Skeleton className="h-16 w-16 rounded-xl bg-[#262626]" />
                    <Skeleton className="h-5 w-2/3 bg-[#262626]" />
                    <Skeleton className="h-4 w-1/2 bg-[#1F1F1F]" />
                </div>
            ))}
        </div>
    )
}

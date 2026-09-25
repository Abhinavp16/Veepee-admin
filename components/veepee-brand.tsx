import { cn } from "@/lib/utils"

interface VeepeeBrandProps {
  compact?: boolean
  className?: string
}

export function VeepeeBrand({ compact = false, className }: VeepeeBrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5 text-white", className)}>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#86efac] text-sm font-black tracking-tight text-black">V</span>
      {!compact && <span className="text-xl font-bold tracking-tight">Veepee</span>}
    </div>
  )
}

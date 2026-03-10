"use client"

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

type PeriodKey = '7d' | '30d' | '90d' | '1y'

const periodMap: { label: string; value: PeriodKey; groupBy: string }[] = [
  { label: '7D', value: '7d', groupBy: 'day' },
  { label: '1M', value: '30d', groupBy: 'day' },
  { label: '3M', value: '90d', groupBy: 'week' },
  { label: '1Y', value: '1y', groupBy: 'month' },
]

interface ChartPoint {
  date: string
  revenue: number
  orders: number
}

export function PerformanceChart() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('30d')

  useEffect(() => {
    fetchSales()
  }, [activePeriod])

  async function fetchSales() {
    setIsLoading(true)
    const p = periodMap.find(p => p.value === activePeriod)!
    try {
      const res = await fetch(
        `https://veepee-impex-raqhn76jm-veepeeimpexs-projects.vercel.app/api/v1/admin/analytics/sales?period=${p.value}&groupBy=${p.groupBy}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } }
      )
      const json = await res.json()
      if (res.ok && json.success) {
        const timeline: { date: string; revenue: number; orders: number }[] = json.data.timeline || []
        setData(timeline.map(t => ({
          date: t.date,
          revenue: t.revenue,
          orders: t.orders,
        })))
      }
    } catch {
      // keep empty
    } finally {
      setIsLoading(false)
    }
  }

  function formatCurrency(val: number) {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
    return `₹${val}`
  }

  const maxRevenue = data.length > 0 ? Math.max(...data.map(d => d.revenue)) : 0
  const yMax = Math.ceil(maxRevenue * 1.2 / 100) * 100 || 1000

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#0D0D0D] rounded-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-2 lg:gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium text-white">Sales Overview</h2>
        </div>

        <div className="flex items-center bg-[#1A1A1A] rounded-lg p-1">
          {periodMap.map((p) => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={`px-3 md:px-2 lg:px-3 py-1 text-sm md:text-xs lg:text-sm rounded-md transition-colors ${
                activePeriod === p.value
                  ? 'bg-[#2A2A2A] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[400px] w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[#86efac]" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No sales data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#86efac" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#86efac" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#666', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, yMax]}
                orientation="left"
                tick={{ fill: '#666', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as ChartPoint
                    return (
                      <div className="bg-[#1A1A1A] border border-[#333] p-3 rounded-lg shadow-xl">
                        <p className="text-white font-medium">₹{d.revenue.toLocaleString('en-IN')}</p>
                        <p className="text-gray-400 text-xs mt-1">{d.orders} orders &middot; {d.date}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#86efac"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

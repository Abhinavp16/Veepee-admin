"use client"

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { apiFetch } from '@/lib/api'
import { useTheme } from 'next-themes'

type PeriodKey = '7d' | '30d' | '90d' | '1y' | 'all'

const periodMap: { label: string; value: PeriodKey; groupBy: string }[] = [
  { label: '7D', value: '7d', groupBy: 'day' },
  { label: '1M', value: '30d', groupBy: 'day' },
  { label: '3M', value: '90d', groupBy: 'week' },
  { label: '1Y', value: '1y', groupBy: 'month' },
  { label: 'ALL', value: 'all', groupBy: 'month' },
]

interface ChartPoint {
  date: string
  revenue: number
  orders: number
}

export function PerformanceChart() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const [data, setData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('all')
  const [error, setError] = useState('')
  const lastFetchedPeriodRef = useRef<PeriodKey | null>(null)

  useEffect(() => {
    if (lastFetchedPeriodRef.current === activePeriod) return
    lastFetchedPeriodRef.current = activePeriod
    fetchSales()
  }, [activePeriod])

  async function fetchSales() {
    setIsLoading(true)
    setError('')
    const p = periodMap.find(p => p.value === activePeriod)!
    try {
      const res = await apiFetch(`/admin/analytics/sales?period=${p.value}&groupBy=${p.groupBy}`)
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        setData([])
        setError('The analytics service returned an invalid response.')
        return
      }

      const json = await res.json()
      if (!res.ok || !json.success) {
        setData([])
        setError(json?.message || 'Sales analytics could not be loaded.')
        return
      }
      if (json.success) {
        const timeline: { date: string; revenue: number; orders: number }[] = json.data.timeline || []
        setData(timeline.map(t => ({
          date: String(t.date || ''),
          revenue: Number(t.revenue) || 0,
          orders: Number(t.orders) || 0,
        })))
      }
    } catch {
      setData([])
      setError('Unable to connect to the analytics service.')
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
    <section className="admin-card flex flex-col gap-6 rounded-2xl border p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-2 lg:gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div><h2 className="text-xl font-semibold text-white">Sales Overview</h2><p className="mt-1 text-sm text-[#737B75]">Verified revenue performance over time</p></div>
        </div>

        <div className="admin-card-muted flex items-center rounded-xl border p-1">
          {periodMap.map((p) => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={`px-3 md:px-2 lg:px-3 py-1 text-sm md:text-xs lg:text-sm rounded-md transition-colors ${
                activePeriod === p.value
                  ? 'bg-[#273229] text-[#A7F3C1] shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card-muted h-[360px] w-full rounded-xl border p-2 sm:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[#86efac]" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-7 w-7 text-amber-400" />
            <p className="max-w-md text-sm text-gray-400">{error}</p>
            <button type="button" onClick={() => { lastFetchedPeriodRef.current = null; void fetchSales() }} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"><RefreshCw className="h-4 w-4" />Retry</button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-gray-500 text-sm">
            <p>No paid sales data for this period.</p>
            {activePeriod !== 'all' && <button type="button" onClick={() => setActivePeriod('all')} className="text-[#86efac] hover:underline">View all-time sales</button>}
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
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#dce5f0' : '#263026'} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: isLight ? '#718096' : '#737b75', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, yMax]}
                orientation="left"
                tick={{ fill: isLight ? '#718096' : '#737b75', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as ChartPoint
                    return (
                      <div className="admin-card rounded-lg border p-3 shadow-xl">
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
    </section>
  )
}

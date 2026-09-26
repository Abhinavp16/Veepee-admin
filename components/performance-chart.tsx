"use client"

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { apiFetch } from '@/lib/api'
import { useTheme } from 'next-themes'

type PeriodKey = '7d' | '30d' | '90d' | '1y' | 'all'

const periodMap: { label: string; value: PeriodKey; groupBy: string }[] = [
  { label: '7D', value: '7d', groupBy: 'day' },
  { label: '1M', value: '30d', groupBy: 'day' },
  { label: '3M', value: '90d', groupBy: 'week' },
  { label: '1Y', value: '1y', groupBy: 'month' },
  { label: 'ALL', value: 'all', groupBy: 'day' },
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
  const lastFetchedPeriodRef = useRef<string | null>(null)

  useEffect(() => {
    const period = periodMap.find(item => item.value === activePeriod)!
    const requestKey = `${period.value}:${period.groupBy}`
    if (lastFetchedPeriodRef.current === requestKey) return
    lastFetchedPeriodRef.current = requestKey
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
  const chartAccent = isLight ? '#2563eb' : '#38bdf8'
  const periodRevenue = data.reduce((total, point) => total + point.revenue, 0)

  return (
    <section className="admin-card flex h-full min-h-[560px] flex-col gap-5 rounded-[1.4rem] border p-5 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="dashboard-eyebrow">Performance</p><h2 className="admin-heading mt-1.5 text-xl font-bold tracking-tight">Sales overview</h2></div>

        <div className="admin-card-muted flex items-center rounded-xl p-1">
          {periodMap.map((p) => (
            <button
              key={p.value}
              onClick={() => setActivePeriod(p.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activePeriod === p.value
                  ? 'dashboard-period-active shadow-sm'
                  : 'admin-muted hover:opacity-70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && !error && data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--admin-border)] py-3">
          <div className="admin-muted flex items-center gap-2 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-[var(--admin-accent)] shadow-[0_0_8px_var(--admin-accent)]" />
            Revenue trend
          </div>
          <div className="flex items-center gap-2">
            <span className="dashboard-icon dashboard-icon-primary !h-7 !w-7"><TrendingUp className="h-3.5 w-3.5" /></span>
            <span><span className="admin-muted block text-[10px] uppercase tracking-wider">Period revenue</span><span className="admin-heading block text-sm font-bold">{formatCurrency(periodRevenue)}</span></span>
          </div>
        </div>
      )}

      <div className="min-h-[390px] w-full flex-1 pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="dashboard-accent h-6 w-6 animate-spin" />
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
            {activePeriod !== 'all' && <button type="button" onClick={() => setActivePeriod('all')} className="dashboard-accent hover:underline">View all-time sales</button>}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartAccent} stopOpacity={isLight ? 0.28 : 0.34} />
                  <stop offset="52%" stopColor={chartAccent} stopOpacity={isLight ? 0.09 : 0.12} />
                  <stop offset="100%" stopColor={chartAccent} stopOpacity={0} />
                </linearGradient>
                <filter id="revenueSplineGlow" x="-20%" y="-30%" width="140%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke={isLight ? '#e0e7f1' : '#25364f'} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: isLight ? '#64748f' : '#93a3bb', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, yMax]}
                orientation="left"
                tick={{ fill: isLight ? '#64748f' : '#93a3bb', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                cursor={{ stroke: chartAccent, strokeOpacity: 0.24, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as ChartPoint
                    return (
                      <div className="admin-card min-w-40 rounded-xl border p-3 shadow-xl">
                        <p className="dashboard-eyebrow !text-[9px]">{d.date}</p>
                        <p className="admin-heading mt-1.5 text-base font-bold">₹{d.revenue.toLocaleString('en-IN')}</p>
                        <p className="admin-muted mt-1 text-xs">{d.orders} paid {d.orders === 1 ? 'order' : 'orders'}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="natural"
                dataKey="revenue"
                stroke={chartAccent}
                strokeWidth={8}
                strokeOpacity={isLight ? 0.1 : 0.13}
                fill="transparent"
                filter="url(#revenueSplineGlow)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                type="natural"
                dataKey="revenue"
                stroke={chartAccent}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                dot={false}
                activeDot={{ r: 6, fill: chartAccent, stroke: isLight ? '#ffffff' : '#0e1828', strokeWidth: 3 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

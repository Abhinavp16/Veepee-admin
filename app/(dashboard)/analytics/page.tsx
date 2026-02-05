"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, TrendingUp, ShoppingCart, IndianRupee, Activity, Users } from "lucide-react"
import { toast } from "sonner"
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'

interface SalesData {
    summary: {
        totalRevenue: number
        totalOrders: number
        averageOrderValue: number
        retailOrders: number
        wholesaleOrders: number
    }
    timeline: { date: string; orders: number; revenue: number }[]
    byCategory: { category: string; orders: number; revenue: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPage() {
    const [salesData, setSalesData] = useState<SalesData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [period, setPeriod] = useState("30d") // 7d, 30d, 90d, 1y

    useEffect(() => {
        fetchSalesAnalytics()
    }, [period])

    async function fetchSalesAnalytics() {
        setIsLoading(true)
        try {
            const res = await fetch(`http://localhost:5000/api/v1/admin/analytics/sales?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            const data = await res.json()
            if (res.ok) {
                setSalesData(data.data)
            } else {
                toast.error("Failed to load analytics")
            }
        } catch (error) {
            console.error(error)
            toast.error("Connection error")
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading && !salesData) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Analytics</h1>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px] bg-[#161616] border-[#333] text-white">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161616] border-[#333] text-white">
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last 3 Months</SelectItem>
                        <SelectItem value="1y">Last Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#161616] border-[#333]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">₹{salesData?.summary.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            +20.1% from last period
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-[#161616] border-[#333]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{salesData?.summary.totalOrders}</div>
                        <div className="text-xs text-gray-500 mt-1">
                            <span className="text-blue-400">{salesData?.summary.retailOrders} Retail</span>
                            {" · "}
                            <span className="text-purple-400">{salesData?.summary.wholesaleOrders} Wholesale</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161616] border-[#333]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Avg. Order Value</CardTitle>
                        <Activity className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">₹{salesData?.summary.averageOrderValue.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            Average spend per customer
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-[#161616] border-[#333]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">3.2%</div>
                        <p className="text-xs text-gray-500 mt-1">
                            Visits to order conversion
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Revenue Chart */}
                <Card className="bg-[#161616] border-[#333] lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="text-white">Revenue Overview</CardTitle>
                        <CardDescription>Daily revenue trends for the selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData?.timeline}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#666"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        tickFormatter={(value) => `₹${value / 1000}k`}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #333', borderRadius: '8px' }}
                                        labelStyle={{ color: '#aaa' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#22c55e" fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Sales by Category */}
                <Card className="bg-[#161616] border-[#333] lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-white">Sales by Category</CardTitle>
                        <CardDescription>Revenue distribution across categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={salesData?.byCategory}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="revenue"
                                    >
                                        {salesData?.byCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                                        contentStyle={{ backgroundColor: '#1F1F1F', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

"use client"

import { Wallet, ShoppingCart, Users, Handshake } from 'lucide-react'

export function DashboardMetrics() {
  return (
    <div className="flex flex-col xl:flex-row gap-8 xl:items-center justify-between p-6 bg-[#0D0D0D] rounded-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-400">
          <Wallet className="h-5 w-5" />
          <span className="text-lg">Total Revenue</span>
        </div>
        <div className="text-5xl md:text-4xl lg:text-5xl font-bold text-white">₹24,50,000</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 xl:gap-16">
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Total Orders</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-white">1,248</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Active Users</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-[#86efac]">856</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm flex items-center gap-2"><Handshake className="w-4 h-4" /> Negotiations</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-[#fbbf24]">12</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Growth</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-[#86efac]">+18.2%</span>
        </div>
      </div>
    </div>
  )
}

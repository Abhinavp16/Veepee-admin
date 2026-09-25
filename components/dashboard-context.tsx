"use client"

import { createContext, useContext } from "react"
import type { DashboardRole } from "@/lib/navigation"

export interface DashboardUser {
  _id: string
  name: string
  email?: string
  avatar?: string | null
  role: DashboardRole
}

const DashboardContext = createContext<DashboardUser | null>(null)

export const DashboardProvider = DashboardContext.Provider

export function useDashboardUser() {
  return useContext(DashboardContext)
}

"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, logout } from "@/lib/api"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        const verifyAuth = async () => {
            const token = localStorage.getItem('accessToken')
            if (!token) {
                router.push('/login')
                return
            }

            try {
                // Verify token is still valid by calling /auth/me
                const res = await apiFetch('/auth/me')
                if (!res.ok) {
                    // Token invalid/expired and refresh failed
                    logout()
                    return
                }
                
                const data = await res.json()
                // /auth/me returns data directly, not data.user
                if (data.data.role !== 'admin') {
                    logout()
                    return
                }
                
                setIsAuthorized(true)
            } catch {
                logout()
            }
        }

        verifyAuth()
    }, [router])

    if (!isAuthorized) {
        return null
    }

    return (
        <div className="relative h-screen w-full bg-black text-white overflow-hidden">
            <Header />

            {/* Main Scrollable Area */}
            <div className="h-full overflow-y-auto no-scrollbar">
                <main className="flex gap-6 p-6 pt-24 min-h-full">
                    <Sidebar />

                    {/* Main Content Container */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

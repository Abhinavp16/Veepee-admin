"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { VeepeeBrand } from "@/components/veepee-brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"
import type { DashboardRole } from "@/lib/navigation"

const loginSchema = z.object({ email: z.string().email("Invalid email address"), password: z.string().min(6, "Password must be at least 6 characters") })
const isDashboardRole = (role: unknown): role is DashboardRole => role === "admin" || role === "staff"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
      const response = await apiFetch("/auth/login", { method: "POST", skipAuth: true, body: JSON.stringify(values) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Login failed")
      if (!isDashboardRole(payload?.data?.user?.role)) throw new Error("Access denied. This dashboard is for Veepee administrators and staff.")
      localStorage.setItem("accessToken", payload.data.accessToken)
      localStorage.setItem("refreshToken", payload.data.refreshToken)
      localStorage.setItem("user", JSON.stringify(payload.data.user))
      toast.success("Welcome back!")
      router.push("/")
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials")
    } finally { setIsLoading(false) }
  }

  return <div className="flex min-h-screen items-center justify-center bg-black p-4"><Card className="w-full max-w-md border-[#333] bg-[#161616]"><CardHeader className="space-y-2"><div className="flex justify-center pb-2"><VeepeeBrand /></div><CardTitle className="text-center text-2xl font-bold text-white">Veepee Admin</CardTitle><CardDescription className="text-center text-gray-400">Sign in to manage Veepee operations</CardDescription></CardHeader><CardContent><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel className="text-white">Email</FormLabel><FormControl><Input placeholder="name@veepee.com" {...field} className="border-[#333] bg-[#0D0D0D] text-white" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel className="text-white">Password</FormLabel><FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="Enter password" {...field} className="border-[#333] bg-[#0D0D0D] pr-10 text-white" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormControl><FormMessage /></FormItem>} /><Button type="submit" className="w-full bg-[#86efac] text-black hover:bg-[#86efac]/90" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In</Button></form></Form></CardContent></Card></div>
}

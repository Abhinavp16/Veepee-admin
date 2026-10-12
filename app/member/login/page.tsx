"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { VeepeeBrand } from "@/components/veepee-brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"

// Staff sign in here. A staff session lasts 6 hours from sign-in and cannot be
// extended, so the working day starts with a fresh sign-in.
export default function MemberLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    try {
      const response = await apiFetch("/auth/staff-login", { method: "POST", skipAuth: true, body: JSON.stringify({ email, password }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Sign in failed")
      const { accessToken, refreshToken, user, sessionExpiresAt } = payload.data
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("user", JSON.stringify(user))
      if (sessionExpiresAt) localStorage.setItem("sessionExpiresAt", sessionExpiresAt)
      router.push(user.mustChangePassword ? "/member/change-password" : "/")
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials")
    } finally { setIsLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-[#333] bg-[#161616]">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-2"><VeepeeBrand /></div>
          <CardTitle className="text-center text-2xl font-bold text-white">Staff sign in</CardTitle>
          <CardDescription className="text-center text-gray-400">Your session lasts 6 hours from sign-in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input required type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" />
            <div className="relative">
              <Input required type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-[#333] bg-[#0D0D0D] pr-10 text-white" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full bg-[#86efac] text-black hover:bg-[#86efac]/90" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in
            </Button>
            <p className="text-center text-xs text-gray-500">Forgot your password? Ask an administrator for a new temporary one.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

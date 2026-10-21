"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { VeepeeBrand } from "@/components/veepee-brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiFetch, saveSession } from "@/lib/api"

// Shown after an administrator issued a temporary password.
export default function MemberChangePasswordPage() {
  const router = useRouter()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) router.replace("/member/login")
  }, [router])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (next.length < 8) { toast.error("Use at least 8 characters"); return }
    if (next !== confirm) { toast.error("The new passwords do not match"); return }
    setIsLoading(true)
    try {
      const response = await apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: next }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Could not change the password")
      saveSession(payload.data)
      toast.success("Password changed")
      router.push("/")
    } catch (error: any) {
      toast.error(error.message)
    } finally { setIsLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-[#333] bg-[#161616]">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-2"><VeepeeBrand /></div>
          <CardTitle className="text-center text-2xl font-bold text-white">Choose your password</CardTitle>
          <CardDescription className="text-center text-gray-400">Replace the temporary password you were given</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input required type="password" placeholder="Temporary password" value={current} onChange={(e) => setCurrent(e.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" />
            <Input required type="password" placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" />
            <Input required type="password" placeholder="Repeat new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" />
            <Button type="submit" className="w-full bg-[#86efac] text-black hover:bg-[#86efac]/90" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

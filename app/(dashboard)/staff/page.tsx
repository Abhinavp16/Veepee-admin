"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2, Plus, ShieldCheck, UserCog } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api"

interface StaffMember { _id: string; name: string; email: string; phone?: string; isActive: boolean; createdAt: string }

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })

  const loadStaff = async () => {
    setLoading(true)
    try {
      const response = await apiFetch("/admin/staff?limit=50")
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Unable to load staff")
      setStaff(payload.data || [])
    } catch (error: any) { toast.error(error.message || "Unable to load staff") } finally { setLoading(false) }
  }
  useEffect(() => { loadStaff() }, [])

  const createStaff = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await apiFetch("/admin/staff", { method: "POST", body: JSON.stringify({ ...form, phone: form.phone || null }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Unable to create staff account")
      toast.success("Staff account created")
      setDialogOpen(false)
      setForm({ name: "", email: "", phone: "", password: "" })
      await loadStaff()
    } catch (error: any) { toast.error(error.message || "Unable to create staff account") } finally { setSaving(false) }
  }

  const updateStatus = async (member: StaffMember) => {
    try {
      const response = await apiFetch(`/admin/staff/${member._id}`, { method: "PATCH", body: JSON.stringify({ isActive: !member.isActive }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || "Unable to update staff account")
      toast.success(member.isActive ? "Staff account deactivated and sessions revoked" : "Staff account activated")
      await loadStaff()
    } catch (error: any) { toast.error(error.message || "Unable to update staff account") }
  }

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#86efac]/10 p-3"><UserCog className="h-6 w-6 text-[#86efac]" /></div><div><h1 className="text-3xl font-bold">Staff Management</h1><p className="text-sm text-[#919191]">Provision and control operational Staff access.</p></div></div><Button onClick={() => setDialogOpen(true)} className="bg-[#86efac] text-black hover:bg-[#86efac]/90"><Plus className="mr-2 h-4 w-4" />Add Staff</Button></div><Card className="border-[#333] bg-[#161616]"><CardHeader><CardTitle className="text-white">Staff accounts</CardTitle></CardHeader><CardContent>{loading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#86efac]" /></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="border-[#333]"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Access</TableHead></TableRow></TableHeader><TableBody>{staff.map((member) => <TableRow key={member._id} className="border-[#333]"><TableCell className="font-medium text-white">{member.name}</TableCell><TableCell className="text-[#919191]">{member.email}</TableCell><TableCell className="text-[#919191]">{member.phone || "—"}</TableCell><TableCell><Badge className={member.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}>{member.isActive ? "Active" : "Deactivated"}</Badge></TableCell><TableCell className="text-[#919191]">{new Date(member.createdAt).toLocaleDateString()}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => updateStatus(member)} className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">{member.isActive ? "Deactivate" : "Activate"}</Button></TableCell></TableRow>)}{staff.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-[#919191]">No staff accounts yet.</TableCell></TableRow>}</TableBody></Table></div>}</CardContent></Card><Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="border-[#333] bg-[#161616] text-white"><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#86efac]" />Create Staff account</DialogTitle><DialogDescription className="text-[#919191]">Staff can access approved operational tools only.</DialogDescription></DialogHeader><form onSubmit={createStaff} className="space-y-4"><Input required placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border-[#333] bg-[#0D0D0D] text-white" /><Input required type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="border-[#333] bg-[#0D0D0D] text-white" /><Input placeholder="Phone (optional)" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="border-[#333] bg-[#0D0D0D] text-white" /><Input required minLength={8} type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="border-[#333] bg-[#0D0D0D] text-white" /><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-[#333] bg-[#0D0D0D] text-white">Cancel</Button><Button disabled={saving} type="submit" className="bg-[#86efac] text-black hover:bg-[#86efac]/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</Button></DialogFooter></form></DialogContent></Dialog></div>
}

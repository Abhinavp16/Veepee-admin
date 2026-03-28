"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, CheckCircle2, XCircle, History, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"

interface Customer {
    _id: string
    name: string
    email: string
    phone: string
    role: string
    businessInfo?: {
        businessName: string
        gstNumber?: string
        businessAddress?: string
        contactPerson?: string
        verified: boolean
        status?: 'pending' | 'accepted' | 'rejected' | 'none'
        proofImages?: string[]
    }
    createdAt: string
    updatedAt: string
}

export default function AccountUpgradesPage() {
    const [pending, setPending] = useState<Customer[]>([])
    const [history, setHistory] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState<string | null>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [showFullHistory, setShowFullHistory] = useState(false)

    // Load applications - assuming an endpoint or passing a query param to getCustomers
    // For now using /admin/customers as base, you may need to update this endpoint 
    // to point to your specific upgrade requests route e.g., `/admin/customers/upgrades`
    useEffect(() => {
        fetchUpgradeRequests()
    }, [])

    async function fetchUpgradeRequests() {
        setIsLoading(true)
        try {
            // Adjust this endpoint if you have a specific one for wholesaler applications
            const res = await apiFetch(`/admin/customers?limit=100`)
            const data = await res.json()
            if (res.ok) {
                // Filter customers who applied for wholesale (have business info but aren't wholesalers yet)
                // or you can rely on a specific backend route that returns only these requests.
                const items = data.data || []
                
                // Applicants are those with status 'pending' or those who have businessName but no status yet (migration fallback)
                const pendingRequests = items.filter((c: Customer) => 
                    c.businessInfo?.status === 'pending' || (c.role !== 'wholesaler' && c.businessInfo?.businessName && !c.businessInfo?.status)
                )
                
                const historyRequests = items.filter((c: Customer) => 
                    c.businessInfo?.status === 'accepted' || c.businessInfo?.status === 'rejected'
                ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                
                setPending(pendingRequests)
                setHistory(historyRequests)
            } else {
                toast.error("Failed to fetch upgrade requests")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAction(id: string, action: 'accept' | 'reject') {
        setIsProcessing(id)
        try {
            // Replace with your actual endpoint for handling applications
            const res = await apiFetch(`/admin/customers/${id}/upgrade`, {
                method: 'PUT',
                body: JSON.stringify({ action })
            })
            
            if (res.ok) {
                toast.success(`Application ${action === 'accept' ? 'accepted' : 'rejected'} successfully`)
                setIsDetailsOpen(false)
                fetchUpgradeRequests() // Refresh list
            } else {
                const data = await res.json()
                toast.error(data.message || `Failed to ${action} application`)
            }
        } catch (error) {
            toast.error("Error connecting to server")
        } finally {
            setIsProcessing(null)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Account Upgrades</h1>
                    <p className="text-gray-400 text-sm">Review applications for wholesaler accounts</p>
                </div>
            </div>

            <Card className="bg-[#161616] border-[#333]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Pending Applications</CardTitle>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {pending.length} New
                    </Badge>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                        </div>
                    ) : pending.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 text-sm italic">No pending upgrade applications currently</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#333] hover:bg-transparent">
                                    <TableHead className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Applicant</TableHead>
                                    <TableHead className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Contact</TableHead>
                                    <TableHead className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Business Name</TableHead>
                                    <TableHead className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Applied On</TableHead>
                                    <TableHead className="text-gray-400 text-right text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pending.map((cust) => (
                                    <TableRow key={cust._id} className="border-[#333] hover:bg-[#1A1A1A]">
                                        <TableCell className="text-white font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold border border-[#333]">
                                                    {cust.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm">{cust.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400">
                                            <div className="text-xs group-hover:text-white transition-colors">{cust.email}</div>
                                            <div className="text-xs text-gray-500">{cust.phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-gray-200">{cust.businessInfo?.businessName}</div>
                                        </TableCell>
                                        <TableCell className="text-gray-500 text-xs">
                                            {new Date(cust.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-[#86efac] hover:text-white hover:bg-[#86efac]/10 border border-transparent hover:border-[#86efac]/20"
                                                onClick={() => {
                                                    setSelectedCustomer(cust)
                                                    setIsDetailsOpen(true)
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                <span className="text-xs font-medium">Review</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* History Section */}
            <Card className="bg-[#161616] border-[#333]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-400" />
                        <CardTitle className="text-white">Application History</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <div className="text-center text-gray-500 py-6 text-sm">No history records yet</div>
                    ) : (
                        <div className="space-y-1">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-[#333] hover:bg-transparent">
                                        <TableHead className="text-gray-400 text-xs uppercase">Business</TableHead>
                                        <TableHead className="text-gray-400 text-xs uppercase">Applicant</TableHead>
                                        <TableHead className="text-gray-400 text-xs uppercase">Status</TableHead>
                                        <TableHead className="text-gray-400 text-xs uppercase">Updated On</TableHead>
                                        <TableHead className="text-gray-400 text-right text-xs uppercase">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(showFullHistory ? history : history.slice(0, 5)).map((cust) => (
                                        <TableRow key={cust._id} className="border-[#333] hover:bg-[#1A1A1A]/40 transition-colors">
                                            <TableCell className="py-3">
                                                <div className="text-sm text-white font-medium">{cust.businessInfo?.businessName}</div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="text-xs text-gray-400">{cust.name}</div>
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge 
                                                    variant="outline" 
                                                    className={`text-[10px] uppercase font-bold ${
                                                        cust.businessInfo?.status === 'accepted' 
                                                        ? "text-green-400 border-green-500/20 bg-green-500/5" 
                                                        : "text-red-400 border-red-500/20 bg-red-500/5"
                                                    }`}
                                                >
                                                    {cust.businessInfo?.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-xs text-gray-500">
                                                {new Date(cust.updatedAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-gray-500 hover:text-white"
                                                    onClick={() => {
                                                        setSelectedCustomer(cust)
                                                        setIsDetailsOpen(true)
                                                    }}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            
                            {history.length > 5 && (
                                <div className="flex justify-center mt-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowFullHistory(!showFullHistory)}
                                        className="text-gray-400 hover:text-[#86efac] text-xs h-8"
                                    >
                                        {showFullHistory ? (
                                            <>Show Less <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                                        ) : (
                                            <>View More ({history.length - 5} others) <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-[#161616] border-[#333] text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>
                            Review the details provided for this wholesaler account upgrade.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCustomer && (
                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-[#0D0D0D] p-5 rounded-lg border border-[#333]">
                                <div className="col-span-2 pb-3 border-b border-[#333] mb-1">
                                    <h3 className="font-semibold text-white mb-3">Personal Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-1">Name</span>
                                            {selectedCustomer.name}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-1">Email</span>
                                            {selectedCustomer.email}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-1">Phone</span>
                                            {selectedCustomer.phone}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-1">Current Role</span>
                                            <Badge variant="outline" className="text-blue-400 border-blue-400 capitalize">
                                                {selectedCustomer.role}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2 pt-1">
                                    <h3 className="font-semibold text-white mb-3">Business Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <span className="text-gray-500 block text-xs mb-1">Business Name</span>
                                            <div className="font-medium text-lg">{selectedCustomer.businessInfo?.businessName || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-1">Contact Person</span>
                                            {selectedCustomer.businessInfo?.contactPerson || 'N/A'}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs mb-1">GST Number</span>
                                            {selectedCustomer.businessInfo?.gstNumber ? (
                                                <span className="font-mono text-blue-300">{selectedCustomer.businessInfo.gstNumber}</span>
                                            ) : (
                                                'N/A'
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-500 block text-xs mb-1">Business Address</span>
                                            <div className="text-gray-300 whitespace-pre-wrap">{selectedCustomer.businessInfo?.businessAddress || 'No address provided'}</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedCustomer.businessInfo?.proofImages && selectedCustomer.businessInfo.proofImages.length > 0 && (
                                    <div className="col-span-2 pt-4 border-t border-[#333] mt-2">
                                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                            Document Proofs
                                            <Badge variant="outline" className="text-xs bg-[#1A1A1A] text-gray-400 border-[#333]">
                                                {selectedCustomer.businessInfo.proofImages.length}
                                            </Badge>
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedCustomer.businessInfo.proofImages.map((url, i) => (
                                                <a href={url} target="_blank" rel="noopener noreferrer" key={i} className="group relative block overflow-hidden rounded-md border border-[#333] hover:border-blue-500/50 transition-colors">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img 
                                                        src={url} 
                                                        alt={`Business proof ${i + 1}`} 
                                                        className="h-28 w-28 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Eye className="w-5 h-5 text-white" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#333]">
                                <Button 
                                    variant="outline" 
                                    className="border-[#333] bg-transparent text-white hover:bg-[#333]"
                                    onClick={() => setIsDetailsOpen(false)}
                                >
                                    Close
                                </Button>
                                {selectedCustomer.businessInfo?.status === 'pending' && (
                                    <>
                                        <Button
                                            variant="default"
                                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50"
                                            disabled={isProcessing === selectedCustomer._id}
                                            onClick={() => handleAction(selectedCustomer._id, 'reject')}
                                        >
                                            {isProcessing === selectedCustomer._id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                                            Reject
                                        </Button>
                                        <Button
                                            variant="default"
                                            className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/50"
                                            disabled={isProcessing === selectedCustomer._id}
                                            onClick={() => handleAction(selectedCustomer._id, 'accept')}
                                        >
                                            {isProcessing === selectedCustomer._id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                            Accept Application
                                        </Button>
                                    </>
                                )}
                                {selectedCustomer.businessInfo?.status === 'accepted' && (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/50">
                                        Previously Accepted
                                    </Badge>
                                )}
                                {selectedCustomer.businessInfo?.status === 'rejected' && (
                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/50">
                                        Previously Rejected
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

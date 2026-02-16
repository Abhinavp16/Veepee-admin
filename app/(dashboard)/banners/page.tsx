"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Save, Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Banner {
    _id?: string
    title: string
    subtitle: string
    tag: string
    imageUrl: string
    linkUrl: string
    isActive: boolean
    order: number
}

export default function BannersPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [heroBanners, setHeroBanners] = useState<Banner[]>([])
    const [promoBanners, setPromoBanners] = useState<Banner[]>([])
    const [isSavingHero, setIsSavingHero] = useState(false)
    const [isSavingPromo, setIsSavingPromo] = useState(false)

    useEffect(() => {
        fetchBanners()
    }, [])

    async function fetchBanners() {
        try {
            const res = await apiFetch('/admin/settings')
            const data = await res.json()
            if (res.ok && data.data) {
                if (data.data.heroBanners) {
                    setHeroBanners(data.data.heroBanners)
                }
                if (data.data.promoBanners) {
                    setPromoBanners(data.data.promoBanners)
                }
            }
        } catch (error) {
            toast.error("Failed to load banners")
        } finally {
            setIsLoading(false)
        }
    }

    // Hero Banners CRUD
    function addHeroBanner() {
        setHeroBanners(prev => [...prev, {
            title: "", subtitle: "", tag: "", imageUrl: "", linkUrl: "",
            isActive: true, order: prev.length,
        }])
    }

    function updateHeroBanner(index: number, field: keyof Banner, value: string | boolean | number) {
        setHeroBanners(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
    }

    function removeHeroBanner(index: number) {
        setHeroBanners(prev => prev.filter((_, i) => i !== index))
    }

    async function saveHeroBanners() {
        setIsSavingHero(true)
        try {
            const res = await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({ heroBanners })
            })
            if (res.ok) {
                toast.success("Hero banners saved successfully")
            } else {
                toast.error("Failed to save hero banners")
            }
        } catch {
            toast.error("Error saving hero banners")
        } finally {
            setIsSavingHero(false)
        }
    }

    // Promo Banners CRUD
    function addPromoBanner() {
        setPromoBanners(prev => [...prev, {
            title: "", subtitle: "", tag: "", imageUrl: "", linkUrl: "",
            isActive: true, order: prev.length,
        }])
    }

    function updatePromoBanner(index: number, field: keyof Banner, value: string | boolean | number) {
        setPromoBanners(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
    }

    function removePromoBanner(index: number) {
        setPromoBanners(prev => prev.filter((_, i) => i !== index))
    }

    async function savePromoBanners() {
        setIsSavingPromo(true)
        try {
            const res = await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({ promoBanners })
            })
            if (res.ok) {
                toast.success("Promo banners saved successfully")
            } else {
                toast.error("Failed to save promo banners")
            }
        } catch {
            toast.error("Error saving promo banners")
        } finally {
            setIsSavingPromo(false)
        }
    }

    function renderBannerCard(
        banner: Banner,
        index: number,
        updateFn: (index: number, field: keyof Banner, value: string | boolean | number) => void,
        removeFn: (index: number) => void
    ) {
        return (
            <div key={index} className="border border-[#333] rounded-lg p-4 space-y-3 bg-[#0D0D0D]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-[#555]" />
                        <span className="text-sm font-medium text-white">Banner {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#919191]">Active</span>
                            <Switch
                                checked={banner.isActive}
                                onCheckedChange={(val) => updateFn(index, 'isActive', val)}
                            />
                        </div>
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => removeFn(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-[#919191] mb-1 block">Title *</label>
                        <Input
                            className="bg-[#161616] border-[#333] text-white text-sm"
                            placeholder="e.g. Summer Sale"
                            value={banner.title}
                            onChange={(e) => updateFn(index, 'title', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#919191] mb-1 block">Tag</label>
                        <Input
                            className="bg-[#161616] border-[#333] text-white text-sm"
                            placeholder="e.g. NEW ARRIVAL"
                            value={banner.tag}
                            onChange={(e) => updateFn(index, 'tag', e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-[#919191] mb-1 block">Subtitle</label>
                    <Input
                        className="bg-[#161616] border-[#333] text-white text-sm"
                        placeholder="e.g. Up to 20% off on bulk orders"
                        value={banner.subtitle}
                        onChange={(e) => updateFn(index, 'subtitle', e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-[#919191] mb-1 block">Image URL</label>
                        <Input
                            className="bg-[#161616] border-[#333] text-white text-sm"
                            placeholder="https://..."
                            value={banner.imageUrl}
                            onChange={(e) => updateFn(index, 'imageUrl', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#919191] mb-1 block">Link URL</label>
                        <Input
                            className="bg-[#161616] border-[#333] text-white text-sm"
                            placeholder="e.g. /product/abc123"
                            value={banner.linkUrl}
                            onChange={(e) => updateFn(index, 'linkUrl', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold text-white">Banner Management</h1>
                <p className="text-[#919191] mt-1">Manage promotional banners shown on the app home screen</p>
            </div>

            <Tabs defaultValue="hero" className="w-full">
                <TabsList className="bg-[#161616] border border-[#333]">
                    <TabsTrigger value="hero" className="data-[state=active]:bg-[#333]">
                        Hero Banners (Top)
                    </TabsTrigger>
                    <TabsTrigger value="promo" className="data-[state=active]:bg-[#333]">
                        Promo Banners (Below Products)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="hero" className="mt-4">
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" /> Hero Banners
                                    </CardTitle>
                                    <CardDescription>Main carousel at the top of the home screen</CardDescription>
                                </div>
                                <Button onClick={addHeroBanner} variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#222]">
                                    <Plus className="h-4 w-4 mr-1" /> Add Banner
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {heroBanners.length === 0 ? (
                                <div className="text-center py-8 text-[#919191]">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">No hero banners yet. Add your first banner.</p>
                                </div>
                            ) : (
                                heroBanners.map((banner, index) => 
                                    renderBannerCard(banner, index, updateHeroBanner, removeHeroBanner)
                                )
                            )}
                            {heroBanners.length > 0 && (
                                <Button onClick={saveHeroBanners} disabled={isSavingHero} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    {isSavingHero && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" /> Save Hero Banners
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="promo" className="mt-4">
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" /> Promo Banners
                                    </CardTitle>
                                    <CardDescription>Secondary carousel below the Popular Products section</CardDescription>
                                </div>
                                <Button onClick={addPromoBanner} variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#222]">
                                    <Plus className="h-4 w-4 mr-1" /> Add Banner
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {promoBanners.length === 0 ? (
                                <div className="text-center py-8 text-[#919191]">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">No promo banners yet. Add your first banner.</p>
                                </div>
                            ) : (
                                promoBanners.map((banner, index) => 
                                    renderBannerCard(banner, index, updatePromoBanner, removePromoBanner)
                                )
                            )}
                            {promoBanners.length > 0 && (
                                <Button onClick={savePromoBanners} disabled={isSavingPromo} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                    {isSavingPromo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" /> Save Promo Banners
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

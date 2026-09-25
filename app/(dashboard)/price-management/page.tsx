"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, History, Loader2, Search, Tag } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Category { _id: string; name: string; nameHindi?: string; productCount: number; image?: { url?: string | null } }
interface Product { _id: string; name: string; nameHindi?: string; sku: string; category: string; stock: number; retailPrice: number; wholesalePrice: number; pendingRetailPrice?: number | null; pendingWholesalePrice?: number | null; priceChangeScheduledAt?: string | null; priceChangeEffectiveAt?: string | null; activePendingPriceChangeAudit?: string | null }
interface PriceChangeAudit { _id: string; productName: string; productSku: string; previousRetailPrice: number; previousWholesalePrice: number; newRetailPrice?: number | null; newWholesalePrice?: number | null; scheduleType: "immediate" | "schedule_24h" | "schedule_48h" | "custom"; scheduledAt: string; effectiveAt: string; status: "scheduled" | "applied" | "superseded"; adminName: string }
interface PriceManagementConfig { businessTimezone: string; customEffectiveHour: number }

type PriceChangeMode = PriceChangeAudit["scheduleType"]
type RowChange = { retailPrice: string; wholesalePrice: string; priceChangeMode: PriceChangeMode; customDate: string }
type StockDraft = { quantity: string }
type StockStep = "entry" | "review"
type ZonedDateTimeParts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

function formatCurrency(value: number | null | undefined) { return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` }


function zonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second) }
}

function businessDate(timeZone: string, daysAhead = 0) {
  const { year, month, day } = zonedDateTimeParts(new Date(), timeZone)
  const shifted = new Date(Date.UTC(year, month - 1, day + daysAhead))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`
}

function customDateToIso(date: string, timeZone: string, hour: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new Error("Choose a valid custom date")
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, 0, 0, 0)
  let candidate = target
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = zonedDateTimeParts(new Date(candidate), timeZone)
    const localTimestamp = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
    const nextCandidate = target - (localTimestamp - candidate)
    if (nextCandidate === candidate) break
    candidate = nextCandidate
  }
  const resolved = new Date(candidate)
  const local = zonedDateTimeParts(resolved, timeZone)
  if (local.year !== Number(match[1]) || local.month !== Number(match[2]) || local.day !== Number(match[3]) || local.hour !== hour || local.minute !== 0 || local.second !== 0) {
    throw new Error(`The selected date does not contain ${String(hour).padStart(2, "0")}:00 in ${timeZone}`)
  }
  return resolved.toISOString()
}

function defaultRowChange(config: PriceManagementConfig): RowChange { return { retailPrice: "", wholesalePrice: "", priceChangeMode: "schedule_24h", customDate: businessDate(config.businessTimezone, 1) } }
function newIdempotencyKey() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}` }
function timingLabel(mode: PriceChangeMode, config: PriceManagementConfig | null, customDate?: string) {
  if (mode === "immediate") return "Immediately"
  if (mode === "schedule_24h") return "Exactly 24 hours after submission"
  if (mode === "schedule_48h") return "Exactly 48 hours after submission"
  if (!config) return "Loading business timezone"
  const time = `${String(config.customEffectiveHour).padStart(2, "0")}:00`
  return customDate ? `${customDate}, ${time} ${config.businessTimezone}` : `Custom, ${time} ${config.businessTimezone}`
}
function formatBusinessDateTime(value: string, config: PriceManagementConfig | null) {
  if (!config) return "Loading business timezone"
  return new Intl.DateTimeFormat("en-IN", { timeZone: config.businessTimezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export default function PriceManagementPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedCategoryId = searchParams.get("categoryId") || ""
  const appliedSearch = searchParams.get("search") || ""
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const [config, setConfig] = useState<PriceManagementConfig | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categorySearch, setCategorySearch] = useState("")
  const [productSearch, setProductSearch] = useState(appliedSearch)
  const [products, setProducts] = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [rowChanges, setRowChanges] = useState<Record<string, RowChange>>({})
  const [stockDrafts, setStockDrafts] = useState<Record<string, StockDraft>>({})
  const [confirmingProduct, setConfirmingProduct] = useState<Product | null>(null)
  const [priceIdempotencyKey, setPriceIdempotencyKey] = useState<string | null>(null)
  const [savingPrice, setSavingPrice] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockReason, setStockReason] = useState("")
  const [stockStep, setStockStep] = useState<StockStep>("entry")
  const [savingStock, setSavingStock] = useState(false)
  const [history, setHistory] = useState<PriceChangeAudit[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const selectedCategory = useMemo(() => categories.find((category) => category._id === selectedCategoryId), [categories, selectedCategoryId])
  const visibleCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    return query ? categories.filter((category) => `${category.name} ${category.nameHindi || ""}`.toLowerCase().includes(query)) : categories
  }, [categories, categorySearch])

  function updateQuery(values: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(values).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key))
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }
  function rowChange(productId: string) { return rowChanges[productId] || (config ? defaultRowChange(config) : { retailPrice: "", wholesalePrice: "", priceChangeMode: "schedule_24h" as const, customDate: "" }) }
  function updateRowChange(productId: string, values: Partial<RowChange>) { setRowChanges((current) => ({ ...current, [productId]: { ...rowChange(productId), ...values } })) }
  function stockDraft(productId: string) { return stockDrafts[productId] || { quantity: "" } }
  function updateStockDraft(productId: string, quantity: string) { setStockDrafts((current) => ({ ...current, [productId]: { ...current[productId], quantity } })) }
  function closePriceConfirmation() {
    if (savingPrice) return
    setConfirmingProduct(null)
    setPriceIdempotencyKey(null)
  }
  function validateStockAddition(product: Product, quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) { toast.error("Enter a positive safe whole number of units to add"); return false }
    const resultingStock = product.stock + quantity
    if (!Number.isSafeInteger(product.stock) || !Number.isSafeInteger(resultingStock)) { toast.error("This addition would make stock exceed the supported safe whole-number limit"); return false }
    return true
  }

  async function fetchConfig() {
    try {
      const response = await apiFetch("/admin/price-management/config")
      const data = await response.json()
      if (!response.ok || typeof data.businessTimezone !== "string" || data.customEffectiveHour !== 8) throw new Error(data.message || "Unable to load business timezone")
      setConfig(data)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Unable to load business timezone")
    }
  }
  async function fetchCategories() {
    try {
      const response = await apiFetch("/admin/price-management/categories")
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to load categories")
      setCategories(Array.isArray(data.data) ? data.data : [])
    } catch (error) { console.error(error); toast.error("Unable to load categories") }
  }
  async function fetchProducts() {
    if (!selectedCategoryId) { setProducts([]); setTotalProducts(0); setTotalPages(1); return }
    setLoadingProducts(true)
    try {
      const params = new URLSearchParams({ categoryId: selectedCategoryId, page: String(page), limit: "20" })
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim())
      const response = await apiFetch(`/admin/products?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to load products")
      setProducts(Array.isArray(data.data) ? data.data : [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalProducts(data.pagination?.total || 0)
    } catch (error) { console.error(error); toast.error(error instanceof Error ? error.message : "Unable to load products") } finally { setLoadingProducts(false) }
  }
  async function fetchHistory(targetPage = historyPage) {
    setLoadingHistory(true)
    try {
      const response = await apiFetch(`/admin/price-change-history?page=${targetPage}&limit=5`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to load price history")
      setHistory(Array.isArray(data.data) ? data.data : [])
      setHistoryPage(data.pagination?.page || targetPage)
      setHistoryTotalPages(data.pagination?.totalPages || 1)
    } catch (error) { console.error(error); toast.error("Unable to load global price history") } finally { setLoadingHistory(false) }
  }

  useEffect(() => { void fetchConfig(); void fetchCategories() }, [])
  useEffect(() => { setProductSearch(appliedSearch) }, [appliedSearch])
  useEffect(() => { void fetchProducts() }, [selectedCategoryId, page, appliedSearch])
  useEffect(() => { void fetchHistory() }, [])

  function submitProductSearch(event: FormEvent) { event.preventDefault(); updateQuery({ search: productSearch.trim() || null, page: null }) }
  function chooseCategory(categoryId: string) { updateQuery({ categoryId, page: null, search: null }) }
  function returnToCategories() { updateQuery({ categoryId: null, page: null, search: null }) }
  function beginPriceConfirmation(product: Product) {
    if (!config) { toast.error("Business timezone is still loading"); return }
    const change = rowChange(product._id)
    const supplied = [change.retailPrice, change.wholesalePrice].filter((value) => value.trim() !== "")
    if (supplied.length === 0) { toast.error("Enter a new retail or wholesale price"); return }
    if (supplied.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) { toast.error("Prices must be finite non-negative numbers"); return }
    if (change.priceChangeMode === "custom" && !/^\d{4}-\d{2}-\d{2}$/.test(change.customDate)) { toast.error(`Choose a custom date for ${String(config.customEffectiveHour).padStart(2, "0")}:00 ${config.businessTimezone}`); return }
    setPriceIdempotencyKey(newIdempotencyKey())
    setConfirmingProduct(product)
  }
  async function savePriceChange() {
    if (!confirmingProduct || !config || !priceIdempotencyKey) return
    const change = rowChange(confirmingProduct._id)
    const payload: { retailPrice?: number; wholesalePrice?: number; priceChangeMode: PriceChangeMode; effectiveAt?: string } = { priceChangeMode: change.priceChangeMode }
    if (change.retailPrice.trim() !== "") payload.retailPrice = Number(change.retailPrice)
    if (change.wholesalePrice.trim() !== "") payload.wholesalePrice = Number(change.wholesalePrice)
    try { if (change.priceChangeMode === "custom") payload.effectiveAt = customDateToIso(change.customDate, config.businessTimezone, config.customEffectiveHour) } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to prepare custom date"); return }
    setSavingPrice(true)
    try {
      const response = await apiFetch(`/admin/products/${confirmingProduct._id}/price-change`, { method: "PUT", headers: { "Idempotency-Key": priceIdempotencyKey }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to save price change")
      const updatedProduct = data.data?.product as Product | undefined
      if (updatedProduct) setProducts((current) => current.map((product) => product._id === updatedProduct._id ? updatedProduct : product))
      setRowChanges((current) => { const next = { ...current }; delete next[confirmingProduct._id]; return next })
      toast.success(change.priceChangeMode === "immediate" ? "Price change applied" : "Price change scheduled")
      setConfirmingProduct(null)
      setPriceIdempotencyKey(null)
      await fetchHistory(1)
    } catch (error) { console.error(error); toast.error(error instanceof Error ? error.message : "Unable to save price change") } finally { setSavingPrice(false) }
  }
  function reviewInlineStockAddition(product: Product) {
    const quantity = Number(stockDraft(product._id).quantity)
    if (!validateStockAddition(product, quantity)) return
    setStockProduct(product); setStockQuantity(String(quantity)); setStockReason(""); setStockStep("review")
  }
  function reviewStockAddition() {
    const quantity = Number(stockQuantity)
    if (!stockProduct || !validateStockAddition(stockProduct, quantity)) return
    setStockStep("review")
  }
  async function applyStockAddition() {
    if (!stockProduct) return
    const quantity = Number(stockQuantity)
    if (!validateStockAddition(stockProduct, quantity)) { setStockStep("entry"); return }
    setSavingStock(true)
    try {
      const response = await apiFetch(`/admin/products/${stockProduct._id}/stock`, { method: "PUT", body: JSON.stringify({ adjustment: `+${quantity}`, reason: stockReason.trim() || "Price management stock addition" }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Unable to add stock")
      setProducts((current) => current.map((product) => product._id === stockProduct._id ? { ...product, stock: data.data.newStock } : product))
      setStockDrafts((current) => { const next = { ...current }; delete next[stockProduct._id]; return next })
      toast.success(`${quantity} units added to stock`)
      setStockProduct(null); setStockQuantity(""); setStockReason(""); setStockStep("entry")
    } catch (error) { console.error(error); toast.error(error instanceof Error ? error.message : "Unable to add stock") } finally { setSavingStock(false) }
  }
  async function exportSnapshot() {
    setExporting(true)
    try {
      const response = await apiFetch("/admin/products/price-snapshot.xlsx")
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || "Unable to export price snapshot") }
      const objectUrl = URL.createObjectURL(await response.blob()); const link = document.createElement("a")
      link.href = objectUrl; link.download = "price-snapshot.xlsx"; link.click(); URL.revokeObjectURL(objectUrl); toast.success("Price snapshot exported")
    } catch (error) { console.error(error); toast.error(error instanceof Error ? error.message : "Unable to export price snapshot") } finally { setExporting(false) }
  }

  const confirmingChange = confirmingProduct ? rowChange(confirmingProduct._id) : null
  const confirmationTiers = confirmingProduct && confirmingChange ? [
    confirmingChange.retailPrice.trim() !== "" ? { label: "Retail", before: confirmingProduct.retailPrice, after: Number(confirmingChange.retailPrice) } : null,
    confirmingChange.wholesalePrice.trim() !== "" ? { label: "Wholesale", before: confirmingProduct.wholesalePrice, after: Number(confirmingChange.wholesalePrice) } : null,
  ].filter(Boolean) as Array<{ label: string; before: number; after: number }> : []
  const stockReviewQuantity = Number(stockQuantity)

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-3xl font-bold text-white">Price Management</h1><p className="text-gray-400">Choose a category, schedule audited retail or wholesale changes, and add stock when needed.</p></div><Button onClick={exportSnapshot} disabled={exporting} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export price snapshot</Button></div>
    {!selectedCategoryId ? <><Card className="border-[#333] bg-[#161616] py-0"><CardContent className="p-5"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><Input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search categories" className="border-[#333] bg-[#0D0D0D] pl-10 text-white" /></div></CardContent></Card><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleCategories.map((category) => <button key={category._id} onClick={() => chooseCategory(category._id)} className="flex min-h-32 gap-4 rounded-xl border border-[#333] bg-[#161616] p-4 text-left transition-colors hover:border-[#86efac]"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0D0D0D]">{category.image?.url ? <img src={category.image.url} alt="" className="h-full w-full object-cover" /> : <Tag className="h-5 w-5 text-[#86efac]" />}</div><div className="min-w-0"><p className="truncate font-medium text-white">{category.name}</p>{category.nameHindi && <p className="truncate text-sm text-gray-400">{category.nameHindi}</p>}<p className="mt-2 text-sm text-[#86efac]">{category.productCount} products</p></div></button>)}</div>{visibleCategories.length === 0 && <p className="py-12 text-center text-gray-400">No categories match this search.</p>}</> : <><Card className="border-[#333] bg-[#161616] py-0"><CardContent className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><Button variant="outline" onClick={returnToCategories} className="border-[#333] text-white hover:bg-[#333]">All Categories</Button><form onSubmit={submitProductSearch} className="flex flex-1 gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search this category by name or SKU" className="border-[#333] bg-[#0D0D0D] pl-10 text-white" /></div><Button type="submit" variant="outline" className="border-[#333] text-white hover:bg-[#333]">Search</Button></form></div><p className="mt-4 text-sm text-gray-400">{selectedCategory?.name || "Selected category"}: {totalProducts} products · 20 per page</p></CardContent></Card><Card className="overflow-hidden border-[#333] bg-[#161616] py-0"><CardContent className="overflow-x-auto p-0">{loadingProducts ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#86efac]" /></div> : products.length === 0 ? <div className="p-12 text-center text-gray-400">No products match this category and search.</div> : <table className="w-full min-w-[1600px] text-sm"><thead className="border-b border-[#333] bg-[#0D0D0D] text-left text-gray-400"><tr><th className="p-4">#</th><th className="p-4">Name / SKU</th><th className="p-4">Current retail</th><th className="p-4">Current wholesale</th><th className="p-4">New retail</th><th className="p-4">New wholesale</th><th className="p-4">Timing</th><th className="p-4">Stock</th><th className="p-4">Pending</th><th className="p-4 text-right">Save</th></tr></thead><tbody>{products.map((product, index) => { const change = rowChange(product._id); return <tr key={product._id} className="border-b border-[#333] last:border-0"><td className="p-4 text-gray-400">{(page - 1) * 20 + index + 1}</td><td className="p-4"><p className="font-medium text-white">{product.name}</p><p className="text-xs text-gray-500">{product.sku}</p></td><td className="p-4 text-[#86efac]">{formatCurrency(product.retailPrice)}</td><td className="p-4 text-white">{formatCurrency(product.wholesalePrice)}</td><td className="p-4"><Input aria-label={`New retail price for ${product.name}`} type="number" min="0" step="any" value={change.retailPrice} onChange={(event) => updateRowChange(product._id, { retailPrice: event.target.value })} placeholder="Leave blank" className="w-32 border-[#333] bg-[#0D0D0D] text-white" /></td><td className="p-4"><Input aria-label={`New wholesale price for ${product.name}`} type="number" min="0" step="any" value={change.wholesalePrice} onChange={(event) => updateRowChange(product._id, { wholesalePrice: event.target.value })} placeholder="Leave blank" className="w-32 border-[#333] bg-[#0D0D0D] text-white" /></td><td className="p-4"><select value={change.priceChangeMode} onChange={(event) => updateRowChange(product._id, { priceChangeMode: event.target.value as PriceChangeMode })} className="h-10 rounded-md border border-[#333] bg-[#0D0D0D] px-3 text-white"><option value="schedule_24h">In 24 hours</option><option value="schedule_48h">In 48 hours</option><option value="custom">{config ? `Custom ${String(config.customEffectiveHour).padStart(2, "0")}:00 ${config.businessTimezone}` : "Loading business timezone"}</option><option value="immediate">Immediate</option></select>{change.priceChangeMode === "custom" && <Input aria-label={`Custom effective date for ${product.name}`} type="date" value={change.customDate} min={config ? businessDate(config.businessTimezone) : undefined} onChange={(event) => updateRowChange(product._id, { customDate: event.target.value })} className="mt-2 border-[#333] bg-[#0D0D0D] text-white" />}</td><td className="p-4"><p className="text-white">{product.stock}</p><div className="mt-2 flex items-center gap-2"><Input aria-label={`Units to add to ${product.name}`} type="number" min="1" step="1" value={stockDraft(product._id).quantity} onChange={(event) => updateStockDraft(product._id, event.target.value)} placeholder="Units" className="w-24 border-[#333] bg-[#0D0D0D] text-white" /><Button size="sm" variant="outline" onClick={() => reviewInlineStockAddition(product)} className="border-[#333] text-white hover:bg-[#333]">Review addition</Button></div></td><td className="p-4">{product.activePendingPriceChangeAudit ? <div className="space-y-1 text-xs text-yellow-300"><p>Retail: {product.pendingRetailPrice == null ? "unchanged" : formatCurrency(product.pendingRetailPrice)}</p><p>Wholesale: {product.pendingWholesalePrice == null ? "unchanged" : formatCurrency(product.pendingWholesalePrice)}</p><p>{product.priceChangeEffectiveAt ? `${formatBusinessDateTime(product.priceChangeEffectiveAt, config)} ${config?.businessTimezone || ""}` : "Scheduled"}</p></div> : <span className="text-gray-500">None</span>}</td><td className="p-4 text-right"><Button size="sm" onClick={() => beginPriceConfirmation(product)} disabled={!config} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">Save price</Button></td></tr> })}</tbody></table>}</CardContent></Card><div className="flex justify-end gap-3"><Button variant="outline" disabled={page <= 1 || loadingProducts} onClick={() => updateQuery({ page: String(page - 1) })} className="border-[#333] text-white hover:bg-[#333]">Previous</Button><span className="flex items-center px-2 text-sm text-gray-400">Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages || loadingProducts} onClick={() => updateQuery({ page: String(page + 1) })} className="border-[#333] text-white hover:bg-[#333]">Next</Button></div></>}
    <Card className="border-[#333] bg-[#161616] py-0"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><History className="h-5 w-5 text-[#86efac]" />Global price-change history</h2><p className="text-sm text-gray-400">The most recent lifecycle records across all products.</p></div><span className="text-sm text-gray-400">5 per page</span></div>{loadingHistory ? <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#86efac]" /></div> : history.length === 0 ? <p className="py-6 text-center text-gray-400">No price changes recorded.</p> : <div className="space-y-2">{history.map((entry) => <div key={entry._id} className="rounded-lg border border-[#333] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-white">{entry.productName} <span className="text-gray-500">· {entry.productSku}</span></p><span className={`rounded px-2 py-1 text-xs ${entry.status === "applied" ? "bg-green-400/10 text-green-300" : entry.status === "superseded" ? "bg-red-400/10 text-red-300" : "bg-yellow-400/10 text-yellow-300"}`}>{entry.status}</span></div><p className="mt-1 text-gray-300">{entry.newRetailPrice != null && `Retail ${formatCurrency(entry.previousRetailPrice)} → ${formatCurrency(entry.newRetailPrice)}`}{entry.newRetailPrice != null && entry.newWholesalePrice != null && " · "}{entry.newWholesalePrice != null && `Wholesale ${formatCurrency(entry.previousWholesalePrice)} → ${formatCurrency(entry.newWholesalePrice)}`}</p><p className="mt-1 text-xs text-gray-500">{timingLabel(entry.scheduleType, config)} · effective {formatBusinessDateTime(entry.effectiveAt, config)} {config?.businessTimezone || ""} · {entry.adminName}</p></div>)}</div>}<div className="mt-4 flex justify-end gap-3"><Button size="sm" variant="outline" disabled={historyPage <= 1 || loadingHistory} onClick={() => void fetchHistory(historyPage - 1)} className="border-[#333] text-white hover:bg-[#333]">Previous</Button><span className="flex items-center text-sm text-gray-400">Page {historyPage} of {historyTotalPages}</span><Button size="sm" variant="outline" disabled={historyPage >= historyTotalPages || loadingHistory} onClick={() => void fetchHistory(historyPage + 1)} className="border-[#333] text-white hover:bg-[#333]">Next</Button></div></CardContent></Card>
    <Dialog open={!!confirmingProduct} onOpenChange={(open) => !open && closePriceConfirmation()}><DialogContent className="border-[#333] bg-[#161616] text-white"><DialogHeader><DialogTitle>Confirm price change — {confirmingProduct?.name}</DialogTitle><DialogDescription className="text-gray-400">Only the supplied tiers will change; MRP is never included.</DialogDescription></DialogHeader><div className="space-y-3 text-sm">{confirmationTiers.map((tier) => <p key={tier.label} className="text-gray-300">{tier.label}: <span className="line-through text-gray-500">{formatCurrency(tier.before)}</span> → <span className="text-white">{formatCurrency(tier.after)}</span></p>)}<p className="text-gray-300">Timing: <span className="text-white">{confirmingChange && timingLabel(confirmingChange.priceChangeMode, config, confirmingChange.customDate)}</span></p>{confirmingChange?.priceChangeMode !== "immediate" && <p className="rounded-md border border-yellow-400/40 bg-yellow-400/10 p-3 text-yellow-200">This new scheduled change will replace any existing pending change for this product. Any previously pending tier is cleared before the new request is applied or scheduled.</p>}</div><DialogFooter><Button variant="ghost" onClick={closePriceConfirmation} disabled={savingPrice} className="text-gray-300 hover:bg-[#333]">Cancel</Button><Button onClick={() => void savePriceChange()} disabled={savingPrice} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">{savingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!stockProduct} onOpenChange={(open) => !open && !savingStock && setStockProduct(null)}><DialogContent className="border-[#333] bg-[#161616] text-white"><DialogHeader><DialogTitle>{stockStep === "review" ? "Review stock addition" : `Add stock — ${stockProduct?.name}`}</DialogTitle><DialogDescription className="text-gray-400">This screen supports positive additions only and reuses the existing stock endpoint.</DialogDescription></DialogHeader>{stockStep === "entry" ? <><label className="space-y-2 text-sm text-gray-300"><span>Units to add</span><Input type="number" min="1" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" /></label><label className="space-y-2 text-sm text-gray-300"><span>Reason (optional)</span><Input value={stockReason} maxLength={200} onChange={(event) => setStockReason(event.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" /></label><DialogFooter><Button variant="ghost" onClick={() => setStockProduct(null)} className="text-gray-300 hover:bg-[#333]">Cancel</Button><Button onClick={reviewStockAddition} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">Review addition</Button></DialogFooter></> : <><div className="space-y-2 rounded-md border border-[#333] bg-[#0D0D0D] p-3 text-sm text-gray-300"><p>Current stock: <span className="text-white">{stockProduct?.stock}</span></p><p>Units to add: <span className="text-white">+{stockReviewQuantity}</span></p><p>New stock: <span className="text-white">{(stockProduct?.stock || 0) + stockReviewQuantity}</span></p></div><label className="space-y-2 text-sm text-gray-300"><span>Reason (optional)</span><Input value={stockReason} maxLength={200} disabled={savingStock} onChange={(event) => setStockReason(event.target.value)} className="border-[#333] bg-[#0D0D0D] text-white" /></label><DialogFooter><Button variant="ghost" onClick={() => setStockStep("entry")} disabled={savingStock} className="text-gray-300 hover:bg-[#333]">Back</Button><Button onClick={() => void applyStockAddition()} disabled={savingStock} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">{savingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm and add stock</Button></DialogFooter></>}</DialogContent></Dialog>
  </div>
}

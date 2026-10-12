"use client"

import { Input } from "@/components/ui/input"

type Props = {
    customer: string
    wholesaler: string
    onCustomerChange: (value: string) => void
    onWholesalerChange: (value: string) => void
    target: string
}

/** Percent-off-MRP inputs shared by the brand and category dialogs. */
export function DiscountFields({ customer, wholesaler, onCustomerChange, onWholesalerChange, target }: Props) {
    return (
        <div className="rounded-lg border border-[#333] p-4 space-y-3">
            <div>
                <p className="text-sm font-medium text-white">Discount off MRP</p>
                <p className="text-xs text-gray-500">
                    When set, every product in this {target} is priced at MRP minus this percent instead of its
                    stored price. A brand discount wins over a category discount. Leave empty for none.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-xs text-gray-400 mb-1 block">Customers (%)</span>
                    <Input
                        type="number"
                        min={0}
                        max={99}
                        step="0.01"
                        placeholder="0"
                        value={customer}
                        onChange={(e) => onCustomerChange(e.target.value)}
                        className="bg-[#0D0D0D] border-[#333] text-white"
                    />
                </label>
                <label className="block">
                    <span className="text-xs text-gray-400 mb-1 block">Wholesalers (%)</span>
                    <Input
                        type="number"
                        min={0}
                        max={99}
                        step="0.01"
                        placeholder="0"
                        value={wholesaler}
                        onChange={(e) => onWholesalerChange(e.target.value)}
                        className="bg-[#0D0D0D] border-[#333] text-white"
                    />
                </label>
            </div>
        </div>
    )
}

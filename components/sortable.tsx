"use client"

import type { CSSProperties, ReactNode } from "react"
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { TableRow } from "@/components/ui/table"

/**
 * Drag-and-drop ordering that works with mouse, touch and keyboard.
 * `onReorder` receives the ids in their new order.
 */
export function SortableProvider({
    ids,
    onReorder,
    children,
}: {
    ids: string[]
    onReorder: (orderedIds: string[]) => void
    children: ReactNode
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id) return
        const from = ids.indexOf(String(active.id))
        const to = ids.indexOf(String(over.id))
        if (from < 0 || to < 0) return
        onReorder(arrayMove(ids, from, to))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}

function useRow(id: string) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
    }
    const handle = (
        <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="cursor-grab touch-none rounded p-1 text-[#777] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac] active:cursor-grabbing"
        >
            <GripVertical className="h-4 w-4" />
        </button>
    )
    return { setNodeRef, style, handle }
}

export function SortableItem({
    id,
    className,
    children,
}: {
    id: string
    className?: string
    children: (handle: ReactNode) => ReactNode
}) {
    const { setNodeRef, style, handle } = useRow(id)
    return <div ref={setNodeRef} style={style} className={className}>{children(handle)}</div>
}

export function SortableTableRow({
    id,
    className,
    children,
}: {
    id: string
    className?: string
    children: (handle: ReactNode) => ReactNode
}) {
    const { setNodeRef, style, handle } = useRow(id)
    return <TableRow ref={setNodeRef} style={style} className={className}>{children(handle)}</TableRow>
}

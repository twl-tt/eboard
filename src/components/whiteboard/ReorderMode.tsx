"use client"

import { useEffect, useMemo, useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { GripVertical, CheckCircle2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Sentence } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  sentences: Sentence[]
}

export function ReorderMode({ sentences }: Props) {
  const cards = useMemo(
    () => sentences.filter((s) => s.text.trim()).map((s) => ({ id: s.id, text: s.text })),
    [sentences]
  )
  const [order, setOrder] = useState<{ id: string; text: string }[]>([])
  const [checked, setChecked] = useState<boolean | null>(null)

  const shuffle = () => {
    setChecked(null)
    const arr = [...cards]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setOrder(arr)
  }

  useEffect(() => {
    shuffle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    setChecked(null)
    const items = [...order]
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setOrder(items)
  }

  const check = () => {
    setChecked(order.every((c, i) => c.id === cards[i].id))
  }

  if (order.length === 0) return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 pb-3">
        <Button variant="secondary" onClick={shuffle}>
          <RotateCcw className="h-4 w-4" /> 重新洗牌
        </Button>
        <Button variant="success" onClick={check}>
          <CheckCircle2 className="h-4 w-4" /> 檢查答案
        </Button>
        {checked !== null && (
          <span className={cn("rounded-full px-4 py-1.5 text-base font-bold", checked ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
            {checked ? "正確！排序完全一致 🎉" : "尚未完全正確，再試一次！"}
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sentences">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-3 overflow-y-auto pb-24">
              {order.map((card, index) => (
                <Draggable key={card.id} draggableId={card.id} index={index}>
                  {(prov, snapshot) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-5 py-4 font-han text-2xl shadow transition-colors",
                        snapshot.isDragging
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
                        checked === true && card.id === cards[index].id && "border-emerald-500 bg-emerald-500/10",
                        checked === false && card.id !== cards[index].id && "border-red-500/60"
                      )}
                    >
                      <GripVertical className="h-6 w-6 shrink-0 text-slate-400" />
                      <span className="mr-1 rounded-lg bg-sky-600/15 px-2 py-0.5 text-sm text-sky-500">{index + 1}</span>
                      <span>{card.text}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

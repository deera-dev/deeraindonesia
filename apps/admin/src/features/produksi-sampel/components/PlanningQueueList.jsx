import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import SampelCard from "./SampelCard";

function DragHandle({ attributes, listeners }) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="shrink-0 w-9 flex flex-col items-center justify-center gap-0.5 self-stretch bg-skin-raised border border-skin-bdr text-skin-text3 hover:text-skin-accent-text hover:border-skin-accent/50 cursor-grab active:cursor-grabbing touch-none transition"
      aria-label="Geser untuk ubah urutan"
      title="Tahan & geser untuk ubah urutan"
    >
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
        <circle cx="6" cy="5" r="1.4" />
        <circle cx="14" cy="5" r="1.4" />
        <circle cx="6" cy="10" r="1.4" />
        <circle cx="14" cy="10" r="1.4" />
        <circle cx="6" cy="15" r="1.4" />
        <circle cx="14" cy="15" r="1.4" />
      </svg>
    </button>
  );
}

function PlanningQueueItem({
  sampel,
  index,
  onEdit,
  onEditPlan,
  onReview,
  onDelete,
  onWoSampel,
  onSampelJadi,
  onApproveRepeat,
  onOpenDiscussion,
  unreadCount,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sampel.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isNext = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch gap-2 transition-shadow ${
        isDragging ? "z-10 shadow-lg shadow-black/30 opacity-90" : ""
      }`}
    >
      <div className="flex flex-col items-stretch shrink-0">
        <DragHandle attributes={attributes} listeners={listeners} />
        <span
          className={`mt-1 h-6 w-9 flex items-center justify-center text-xs font-bold font-editorial shrink-0 ${
            isNext
              ? "bg-skin-accent text-skin-on-accent"
              : "bg-skin-raised text-skin-text3 border border-skin-bdr"
          }`}
        >
          {index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {isNext && (
          <p className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-accent-text">
            ▸ Berikutnya
          </p>
        )}
        <SampelCard
          sampel={sampel}
          onEdit={onEdit}
          onEditPlan={onEditPlan}
          onReview={onReview}
          onDelete={onDelete}
          onWoSampel={onWoSampel}
          onSampelJadi={onSampelJadi}
          onApproveRepeat={onApproveRepeat}
          onOpenDiscussion={onOpenDiscussion}
          unreadCount={unreadCount}
        />
      </div>
    </div>
  );
}

export default function PlanningQueueList({
  items,
  onReorder,
  onEdit,
  onEditPlan,
  onReview,
  onDelete,
  onWoSampel,
  onSampelJadi,
  onApproveRepeat,
  onOpenDiscussion,
  unreadCounts = {},
}) {
  const [order, setOrder] = useState(items);

  useEffect(() => {
    setOrder(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((s) => s.id === active.id);
    const newIndex = order.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    onReorder(newOrder.map((s) => s.id));
  }

  if (order.length === 0) return null;

  return (
    <div className="space-y-3">
      {order.length > 1 && (
        <p className="text-xs text-skin-text3 flex items-center gap-1.5">
          <span className="text-skin-accent-text">⠿</span>
          Urutan menentukan mana yang dikerjakan lebih dulu — tahan ikon di kiri &amp; geser untuk
          mengubah.
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((sampel, index) => (
              <PlanningQueueItem
                key={sampel.id}
                sampel={sampel}
                index={index}
                onEdit={onEdit}
                onEditPlan={onEditPlan}
                onReview={onReview}
                onDelete={onDelete}
                onWoSampel={onWoSampel}
                onSampelJadi={onSampelJadi}
                onApproveRepeat={onApproveRepeat}
                onOpenDiscussion={onOpenDiscussion}
                unreadCount={unreadCounts[sampel.id] ?? 0}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom tidak bisa mensimulasikan geometri drag asli @dnd-kit — mock
// DndContext supaya kita bisa capture & panggil langsung `onDragEnd`
// (permintaan Denny 2026-08: drag & drop reorder Planning).
let capturedOnDragEnd;
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }) => {
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...args) => args),
}));

// arrayMove dibiarkan real (pure function) supaya assertion mencerminkan
// perilaku sebenarnya, komponen dnd-nya saja yang dimock.
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <div data-testid="sortable-context">{children}</div>,
  arrayMove: (arr, from, to) => {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

vi.mock("./SampelCard", () => ({
  default: ({ sampel, onEdit, onReview, onDelete, onMarkDibuat, onOpenDiscussion }) => (
    <div data-testid="sampel-card-mock">
      <span>{sampel.nama}</span>
      <button onClick={() => onEdit(sampel)}>Edit-{sampel.id}</button>
      <button onClick={() => onReview(sampel)}>Review-{sampel.id}</button>
      <button onClick={() => onDelete(sampel)}>Hapus-{sampel.id}</button>
      <button onClick={() => onMarkDibuat(sampel)}>MarkDibuat-{sampel.id}</button>
      <button onClick={() => onOpenDiscussion(sampel)}>Diskusi-{sampel.id}</button>
    </div>
  ),
}));

import PlanningQueueList from "./PlanningQueueList";

const items = [
  { id: "p1", nama: "Planning Satu" },
  { id: "p2", nama: "Planning Dua" },
  { id: "p3", nama: "Planning Tiga" },
];

beforeEach(() => {
  capturedOnDragEnd = undefined;
});

describe("PlanningQueueList", () => {
  it("render null (tidak ada apapun) kalau items kosong", () => {
    const { container } = render(
      <PlanningQueueList items={[]} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("render semua item sesuai urutan dengan badge nomor urut", () => {
    render(
      <PlanningQueueList items={items} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    const cards = screen.getAllByTestId("sampel-card-mock");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Planning Satu");
    expect(cards[1]).toHaveTextContent("Planning Dua");
    expect(cards[2]).toHaveTextContent("Planning Tiga");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("hanya item index 0 yang diberi label 'Dikerjakan Berikutnya'", () => {
    render(
      <PlanningQueueList items={items} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    expect(screen.getAllByText(/Dikerjakan Berikutnya/)).toHaveLength(1);
  });

  it("drag handle punya aria-label supaya jelas bisa digeser (aksesibilitas)", () => {
    render(
      <PlanningQueueList items={items} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    expect(screen.getAllByLabelText("Geser untuk ubah urutan")).toHaveLength(3);
  });

  it("menampilkan hint urutan kalau item > 1", () => {
    render(
      <PlanningQueueList items={items} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    expect(screen.getByText(/Urutan menentukan mana yang dikerjakan lebih dulu/)).toBeInTheDocument();
  });

  it("tidak menampilkan hint urutan kalau item cuma 1", () => {
    render(
      <PlanningQueueList items={[items[0]]} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    expect(screen.queryByText(/Urutan menentukan mana yang dikerjakan lebih dulu/)).not.toBeInTheDocument();
  });

  it("drag p3 ke posisi p1 (over) memanggil onReorder dengan urutan baru", () => {
    const onReorder = vi.fn();
    render(
      <PlanningQueueList items={items} onReorder={onReorder} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    expect(typeof capturedOnDragEnd).toBe("function");
    act(() => {
      capturedOnDragEnd({ active: { id: "p3" }, over: { id: "p1" } });
    });
    expect(onReorder).toHaveBeenCalledWith(["p3", "p1", "p2"]);
  });

  it("setelah drag, badge 'Dikerjakan Berikutnya' pindah ke item baru di posisi teratas", () => {
    render(
      <PlanningQueueList items={items} onReorder={vi.fn()} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    act(() => {
      capturedOnDragEnd({ active: { id: "p3" }, over: { id: "p1" } });
    });
    const cards = screen.getAllByTestId("sampel-card-mock");
    expect(cards[0]).toHaveTextContent("Planning Tiga");
  });

  it("tidak memanggil onReorder kalau drop di luar area (over null)", () => {
    const onReorder = vi.fn();
    render(
      <PlanningQueueList items={items} onReorder={onReorder} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    act(() => {
      capturedOnDragEnd({ active: { id: "p1" }, over: null });
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("tidak memanggil onReorder kalau drop di posisi yang sama (active === over)", () => {
    const onReorder = vi.fn();
    render(
      <PlanningQueueList items={items} onReorder={onReorder} onEdit={vi.fn()} onReview={vi.fn()} onDelete={vi.fn()} onMarkDibuat={vi.fn()} />,
    );
    act(() => {
      capturedOnDragEnd({ active: { id: "p2" }, over: { id: "p2" } });
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("meneruskan onEdit/onReview/onDelete/onMarkDibuat/onOpenDiscussion ke SampelCard per item", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onReview = vi.fn();
    const onDelete = vi.fn();
    const onMarkDibuat = vi.fn();
    const onOpenDiscussion = vi.fn();
    render(
      <PlanningQueueList
        items={items}
        onReorder={vi.fn()}
        onEdit={onEdit}
        onReview={onReview}
        onDelete={onDelete}
        onMarkDibuat={onMarkDibuat}
        onOpenDiscussion={onOpenDiscussion}
      />,
    );
    await user.click(screen.getByText("Edit-p2"));
    expect(onEdit).toHaveBeenCalledWith(items[1]);
    await user.click(screen.getByText("Review-p2"));
    expect(onReview).toHaveBeenCalledWith(items[1]);
    await user.click(screen.getByText("Hapus-p2"));
    expect(onDelete).toHaveBeenCalledWith(items[1]);
    await user.click(screen.getByText("MarkDibuat-p2"));
    expect(onMarkDibuat).toHaveBeenCalledWith(items[1]);
    await user.click(screen.getByText("Diskusi-p2"));
    expect(onOpenDiscussion).toHaveBeenCalledWith(items[1]);
  });
});

import { useCallback, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BarChart03, DotsGrid, Trash01 } from "@untitledui/icons";
import { WIDGET_SIZES } from "@demo-panel/shared/widgets";
import { WidgetCard } from "@/components/ui/widgets";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * The dashboard layout canvas: arrange a role's pinned sections by dragging
 * them, and resize from any edge or corner.
 *
 * It looks like a free canvas but is deliberately NOT one. The dashboard
 * itself is a responsive CSS grid (1 / 2 / 4 columns by breakpoint), so a
 * free x/y position could not be reproduced for a viewer on a phone — the
 * editor would be showing a layout nobody else ever sees. Everything here
 * snaps to that same 4-column grid, which is exactly what `sequence` + `size`
 * already store. So: no schema change, and what you arrange is what every
 * viewer gets at every width.
 *
 * Sizes map to column spans: sm=1, md=2, lg=3, full=4.
 */

const SPAN = { sm: 1, md: 2, lg: 3, full: 4 };
const SIZE_FOR_SPAN = { 1: "sm", 2: "md", 3: "lg", 4: "full" };
const SIZE_LABELS = { sm: "1 col", md: "2 col", lg: "3 col", full: "Full" };

/** Card footprint on the canvas grid — mirrors SIZE_CLASSES on the dashboard. */
const SPAN_CLASSES = {
    sm: "col-span-1",
    md: "col-span-1 sm:col-span-2",
    lg: "col-span-1 sm:col-span-2 xl:col-span-3",
    full: "col-span-1 sm:col-span-2 xl:col-span-4",
};

/**
 * A stat tile is one number, so it defaults to the narrowest column — four fit
 * on a row instead of two. Only a *new* pin gets this; an existing one keeps
 * whatever width was saved for it.
 */
export const defaultSizeFor = (chartType) => (chartType === "stat" ? "sm" : "md");

/**
 * The eight resize handles. `edge` is which side moves, `axis` decides the
 * cursor, and `dir` is which way the width grows when the pointer moves right.
 * Dragging a left handle leftward widens the card, hence dir: -1.
 */
const HANDLES = [
    { edge: "e", dir: 1, cursor: "ew-resize", className: "inset-y-3 right-0 w-1.5" },
    { edge: "w", dir: -1, cursor: "ew-resize", className: "inset-y-3 left-0 w-1.5" },
    { edge: "n", dir: 0, cursor: "ns-resize", className: "inset-x-3 top-0 h-1.5" },
    { edge: "s", dir: 0, cursor: "ns-resize", className: "inset-x-3 bottom-0 h-1.5" },
    { edge: "ne", dir: 1, cursor: "nesw-resize", className: "right-0 top-0 size-3" },
    { edge: "se", dir: 1, cursor: "nwse-resize", className: "bottom-0 right-0 size-3" },
    { edge: "nw", dir: -1, cursor: "nwse-resize", className: "left-0 top-0 size-3" },
    { edge: "sw", dir: -1, cursor: "nesw-resize", className: "bottom-0 left-0 size-3" },
];

/**
 * One draggable section. The whole card is the drag handle except the resize
 * grips and the action buttons, so it feels like moving the thing itself
 * rather than hunting for a handle.
 */
const CanvasCard = ({ pin, result, onResize, onRemove, canEdit, columnWidth, onResizeStateChange }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: pin.widgetId,
        disabled: !canEdit,
    });

    // Live span while a resize drag is in flight. Kept local so only this card
    // re-renders on pointer move; it is committed to the parent on release.
    const [draftSpan, setDraftSpan] = useState(null);
    const drag = useRef(null);

    const savedSpan = SPAN[pin.size] ?? 2;
    const span = draftSpan ?? savedSpan;
    const size = SIZE_FOR_SPAN[span] ?? pin.size;

    /**
     * Vertical handles (n/s) have no effect on layout: the grid decides row
     * height from content, so a card cannot be made taller without a row-span
     * concept the dashboard does not have. They still exist as grips so the
     * card reads as resizable from every side, and they snap back on release.
     */
    const startResize = (event, handle) => {
        if (!canEdit || handle.dir === 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { startX: event.clientX, startSpan: savedSpan, dir: handle.dir };
        onResizeStateChange?.(true);
    };

    const moveResize = (event) => {
        if (!drag.current) return;
        const { startX, startSpan, dir } = drag.current;
        // One column of pointer travel = one column of span. columnWidth comes
        // from the measured grid, so the card tracks the cursor exactly.
        const delta = Math.round(((event.clientX - startX) * dir) / Math.max(columnWidth, 1));
        const next = Math.min(4, Math.max(1, startSpan + delta));
        if (next !== span) setDraftSpan(next);
    };

    const endResize = (event) => {
        if (!drag.current) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        drag.current = null;
        onResizeStateChange?.(false);
        if (draftSpan && draftSpan !== savedSpan) onResize(pin.widgetId, SIZE_FOR_SPAN[draftSpan]);
        setDraftSpan(null);
    };

    /** Arrow keys resize too, so this is not a pointer-only control. */
    const keyResize = (event) => {
        if (!canEdit) return;
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        const next = Math.min(4, Math.max(1, savedSpan + step));
        if (next !== savedSpan) onResize(pin.widgetId, SIZE_FOR_SPAN[next]);
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                // dnd-kit's own transition while sorting; a snappier curve of
                // our own when a resize snaps to the next column.
                transition: transition ?? "grid-column 220ms cubic-bezier(0.2, 0, 0, 1)",
            }}
            className={cx(
                "group relative",
                SPAN_CLASSES[size] ?? SPAN_CLASSES.md,
                // Match the dashboard: a stat tile is as tall as its number,
                // not as tall as whatever chart shares its row.
                result?.result?.chartType === "stat" && "self-start",
                // will-change keeps the transform on the compositor, which is
                // what stops the chart inside from juddering during a drag.
                "will-change-transform",
                isDragging ? "z-10 opacity-40" : "transition-[opacity,box-shadow] duration-200",
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className={cx(
                    "h-full rounded-xl ring-1 transition-[box-shadow,transform] duration-200 ease-out",
                    canEdit
                        ? "cursor-grab ring-secondary hover:ring-brand hover:shadow-md active:cursor-grabbing"
                        : "ring-secondary",
                    draftSpan && "ring-2 ring-brand shadow-lg",
                )}
            >
                {/* The wrapper already owns the column span, so the card is
                    told "full" and simply fills it. */}
                <WidgetCard
                    title={pin.title}
                    size="full"
                    result={result?.result ?? null}
                    error={result?.error ?? null}
                    seriesColors={result?.result?.seriesColors}
                />
            </div>

            {canEdit && (
                <>
                    <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-tertiary ring-1 ring-secondary">
                            {SIZE_LABELS[size]}
                        </span>
                        <span className="pointer-events-auto">
                            <Button
                                size="sm"
                                color="tertiary"
                                iconLeading={Trash01}
                                aria-label={`Unpin ${pin.title}`}
                                onClick={() => onRemove(pin.widgetId)}
                            />
                        </span>
                    </div>

                    <span className="pointer-events-none absolute left-2 top-2 text-fg-quaternary opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <DotsGrid className="size-4" />
                    </span>

                    {/* Eight grips: four edges, four corners. */}
                    {HANDLES.map((handle) => (
                        <span
                            key={handle.edge}
                            role={handle.dir === 0 ? "presentation" : "slider"}
                            aria-label={handle.dir === 0 ? undefined : `Width of ${pin.title}`}
                            aria-valuemin={handle.dir === 0 ? undefined : 1}
                            aria-valuemax={handle.dir === 0 ? undefined : 4}
                            aria-valuenow={handle.dir === 0 ? undefined : span}
                            tabIndex={handle.edge === "e" ? 0 : -1}
                            onPointerDown={(event) => startResize(event, handle)}
                            onPointerMove={moveResize}
                            onPointerUp={endResize}
                            onPointerCancel={endResize}
                            onKeyDown={handle.edge === "e" ? keyResize : undefined}
                            style={{ cursor: handle.dir === 0 ? "default" : handle.cursor }}
                            className={cx(
                                "absolute z-10 rounded-full opacity-0 transition-opacity duration-150",
                                "group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-focus-ring",
                                handle.dir === 0 ? "bg-transparent" : "bg-brand-solid/50 hover:bg-brand-solid",
                                handle.className,
                            )}
                        />
                    ))}
                </>
            )}
        </div>
    );
};

export const DashboardCanvas = ({ pins, results = {}, onChange, canEdit = true }) => {
    const [activeId, setActiveId] = useState(null);
    const [resizing, setResizing] = useState(false);
    const gridRef = useRef(null);
    const [columnWidth, setColumnWidth] = useState(240);

    /**
     * Measure one grid column so a resize drag tracks the pointer exactly
     * rather than guessing. Re-measured whenever the grid resizes, which
     * covers both window resizes and the sidebar opening.
     */
    const measure = useCallback((node) => {
        gridRef.current = node;
        if (!node) return;
        const read = () => {
            const columns = getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean);
            const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
            if (columns.length) setColumnWidth(parseFloat(columns[0]) + gap);
        };
        read();
        const observer = new ResizeObserver(read);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const sensors = useSensors(
        // A small distance so a click on the delete button is not read as a drag.
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const ids = useMemo(() => pins.map((pin) => pin.widgetId), [pins]);
    const active = pins.find((pin) => pin.widgetId === activeId);

    const handleDragEnd = ({ active: from, over }) => {
        setActiveId(null);
        if (!over || from.id === over.id) return;
        const oldIndex = ids.indexOf(from.id);
        const newIndex = ids.indexOf(over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        onChange(arrayMove(pins, oldIndex, newIndex));
    };

    const resize = (widgetId, size) => onChange(pins.map((pin) => (pin.widgetId === widgetId ? { ...pin, size } : pin)));
    const remove = (widgetId) => onChange(pins.filter((pin) => pin.widgetId !== widgetId));

    if (pins.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-secondary py-16 text-center">
                <BarChart03 className="size-6 text-fg-quaternary" />
                <p className="text-sm font-medium text-secondary">Nothing pinned yet</p>
                <p className="max-w-72 text-xs text-tertiary">
                    Add a section above and it appears here. Drag to arrange, drag any edge or corner to resize.
                </p>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active: from }) => setActiveId(from.id)}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={ids} strategy={rectSortingStrategy}>
                {/* The column guides sit behind the cards: four tracks at xl,
                    two below, so the grid you are snapping to is visible while
                    you drag rather than being something you infer. */}
                <div className="relative">
                    <div
                        aria-hidden="true"
                        className={cx(
                            "pointer-events-none absolute inset-0 grid grid-cols-1 gap-5 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-4",
                            activeId || resizing ? "opacity-100" : "opacity-0",
                        )}
                    >
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className={cx(
                                    "rounded-xl border border-dashed border-brand/40 bg-brand-primary/20",
                                    index >= 1 && "hidden sm:block",
                                    index >= 2 && "hidden xl:block",
                                )}
                            />
                        ))}
                    </div>

                    {/* The same column counts as the real dashboard, so what is
                        arranged here is what a viewer sees at every width. */}
                    <div ref={measure} className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {pins.map((pin) => (
                            <CanvasCard
                                key={pin.widgetId}
                                pin={pin}
                                result={results[pin.widgetId]}
                                onResize={resize}
                                onRemove={remove}
                                canEdit={canEdit}
                                columnWidth={columnWidth}
                                onResizeStateChange={setResizing}
                            />
                        ))}
                    </div>
                </div>
            </SortableContext>

            {/* The card follows the cursor at full opacity while the original
                stays dimmed in place — without it a drag looks like the card
                vanished. */}
            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                {active ? (
                    <div className="cursor-grabbing rounded-xl opacity-95 shadow-xl ring-2 ring-brand">
                        <WidgetCard
                            title={active.title}
                            size="full"
                            result={results[active.widgetId]?.result ?? null}
                            error={results[active.widgetId]?.error ?? null}
                            seriesColors={results[active.widgetId]?.result?.seriesColors}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export { SPAN, SIZE_FOR_SPAN, WIDGET_SIZES };

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table } from "@/components/application/table/table";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/**
 * Keeps react-data-table-component's prop shape but renders Untitled UI's
 * Table + Pagination, so the 14 CRUD pages only changed their import.
 *
 * Deliberately preserves two quirks of the old table rather than "fixing" them,
 * because the server query is built from them:
 *   - a column with `sortable: true` and no `sortField` still reports an
 *     undefined sort field (see Country's "Sr No" column);
 *   - onChangeRowsPerPage is called with (perPage, page) even though every
 *     caller ignores the second argument.
 */
const DataTable = ({
    columns = [],
    data = [],
    progressPending = false,
    onSort,
    paginationTotalRows = 0,
    paginationPerPage = 10,
    paginationRowsPerPageOptions = [10, 25, 50, 100],
    onChangeRowsPerPage,
    onChangePage,
    noDataComponent = "There are no records to display",
    ariaLabel = "Data table",
    widths = {},
    onResize,
}) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(paginationPerPage);
    const [sortDescriptor, setSortDescriptor] = useState(undefined);

    // React Aria needs a stable, unique, defined id per column. `sortField` is
    // the server's sort key and is genuinely absent on some columns, so fall
    // back to the index for identity while still reporting the original
    // (possibly undefined) sortField back to the caller.
    const cols = useMemo(
        () => columns.map((c, i) => ({ ...c, _id: c.sortField ? `f:${c.sortField}` : `c:${i}` })),
        [columns],
    );

    const dragging = useRef(null);

    const startResize = useCallback(
        (event, colName, currentWidth) => {
            event.preventDefault();
            event.stopPropagation();
            dragging.current = { colName, startX: event.clientX, startWidth: currentWidth };
        },
        [],
    );

    useEffect(() => {
        if (!onResize) return;

        const onMove = (event) => {
            if (!dragging.current) return;
            const { colName, startX, startWidth } = dragging.current;
            const next = Math.max(80, Math.round(startWidth + (event.clientX - startX)));
            onResize(colName, next);
        };
        const onUp = () => {
            dragging.current = null;
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [onResize]);

    const handleSortChange = (descriptor) => {
        setSortDescriptor(descriptor);
        const col = cols.find((c) => c._id === descriptor.column);
        onSort?.(
            { sortField: col?.sortField, name: col?.name },
            descriptor.direction === "ascending" ? "asc" : "desc",
        );
    };

    const totalPages = Math.max(1, Math.ceil((paginationTotalRows || 0) / (perPage || 1)));
    const options = paginationRowsPerPageOptions.filter((n) => Number.isFinite(n) && n > 0);

    return (
        <div className="relative overflow-x-auto">
            <Table
                aria-label={ariaLabel}
                sortDescriptor={sortDescriptor}
                onSortChange={handleSortChange}
                className="min-w-full"
            >
                <Table.Header size="sm">
                    {cols.map((col, i) => {
                        const width = widths[col.name] ?? col.width;
                        return (
                            <Table.Head
                                key={col._id}
                                id={col._id}
                                label={col.name}
                                isRowHeader={i === 0}
                                allowsSorting={Boolean(col.sortable)}
                                className="relative px-5"
                                style={
                                    width
                                        ? { width, minWidth: width, maxWidth: width }
                                        : { minWidth: col.minWidth, maxWidth: col.maxWidth }
                                }
                            >
                                {onResize && i < cols.length - 1 && (
                                    <span
                                        role="separator"
                                        aria-label={`Resize ${col.name}`}
                                        onPointerDown={(e) =>
                                            startResize(e, col.name, e.currentTarget.parentElement?.offsetWidth ?? 160)
                                        }
                                        className="absolute inset-y-0 -right-px z-10 w-1.5 cursor-col-resize touch-none hover:bg-brand-solid/40"
                                    />
                                )}
                            </Table.Head>
                        );
                    })}
                </Table.Header>
                <Table.Body
                    renderEmptyState={() => (
                        <div className="flex items-center justify-center px-6 py-10 text-sm text-tertiary">
                            {progressPending ? "" : noDataComponent}
                        </div>
                    )}
                >
                    {data.map((row, index) => (
                        <Table.Row size="sm" key={row?._id ?? index} id={String(row?._id ?? index)}>
                            {cols.map((col, colIndex) => (
                                <Table.Cell
                                    size="sm"
                                    key={col._id}
                                    className={colIndex === 1 ? "font-medium text-primary" : undefined}
                                >
                                    {col.cell ? col.cell(row, index) : col.selector?.(row, index)}
                                </Table.Cell>
                            ))}
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>

            {progressPending && (
                <div className="flex items-center justify-center px-6 py-10">
                    <LoadingIndicator type="dot-circle" size="md" />
                </div>
            )}

            {paginationTotalRows > 0 && (
                <PaginationCardMinimal
                    page={page}
                    total={totalPages}
                    pageSize={perPage}
                    pageSizeOptions={options}
                    onPageChange={(p) => {
                        setPage(p);
                        onChangePage?.(p);
                    }}
                    onPageSizeChange={(n) => {
                        setPerPage(n);
                        setPage(1);
                        onChangeRowsPerPage?.(n, 1);
                    }}
                />
            )}
        </div>
    );
};

export default DataTable;

import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Eye, FilterLines, RefreshCw01 } from "@untitledui/icons";
import { MenuContext } from "../../context/MenuContext";
import { getAuditLogById, getAuditedModels, searchAuditLogs } from "../../api/auditLogs.api";
import DataTable from "@/components/ui/data-table";
import FilterPanel from "@/components/ui/filter-panel";
import { FormModal } from "@/components/ui/modal";
import { Card, PageHeader } from "@/components/ui/page";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";

/**
 * Every change made through the panel: who, what, when, and the fields either
 * side of it.
 *
 * A custom page rather than an entity config, because this collection has no
 * add, edit or delete — a generated CRUD screen would offer all three, and the
 * one thing an audit log must never do is let someone edit it.
 */

const ACTION_STYLE = {
    create: { color: "success", label: "Created" },
    update: { color: "brand", label: "Updated" },
    delete: { color: "error", label: "Deleted" },
    restore: { color: "warning", label: "Restored" },
    updateMany: { color: "gray", label: "Bulk update" },
};

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString(undefined, {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

/** Nothing, an empty string and a redaction all need to read differently. */
const Value = ({ value }) => {
    if (value === null || value === undefined) {
        return <span className="text-quaternary italic">not set</span>;
    }
    if (value === "") return <span className="text-quaternary italic">empty</span>;
    if (value === "[REDACTED]") {
        return <span className="font-medium text-warning-primary">hidden</span>;
    }
    return <span className="break-all">{String(value)}</span>;
};

const FILTER_FIELDS = [
    { name: "model", label: "Record type", type: "enum", optionsFrom: "models" },
    { name: "recordLabel", label: "Record name", type: "string" },
    {
        name: "action",
        label: "Action",
        type: "enum",
        options: Object.entries(ACTION_STYLE).map(([value, { label }]) => ({ value, label })),
    },
    { name: "actor.name", label: "Changed by", type: "string" },
    { name: "actor.email", label: "Changed by (email)", type: "string" },
    { name: "actor.role", label: "Role", type: "enum", options: [
        { value: "ADMIN", label: "Admin" },
        { value: "USER", label: "User" },
    ] },
    { name: "ip", label: "IP address", type: "string" },
    { name: "createdAt", label: "When", type: "date" },
];

const AuditLog = () => {
    const { currentPagePermissions } = useContext(MenuContext);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [column, setColumn] = useState("createdAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [query, setQuery] = useState("");

    const [showFilters, setShowFilters] = useState(false);
    const [draft, setDraft] = useState({ rows: [], matchType: "all" });
    const [applied, setApplied] = useState([]);
    const [matchType, setMatchType] = useState("all");
    const [lookups, setLookups] = useState({ models: [] });

    const [detail, setDetail] = useState(null);

    const fetchRows = async () => {
        setLoading(true);
        try {
            const response = await searchAuditLogs({
                skip: Math.max((pageNo - 1) * perPage, 0),
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
                isActive: true,
                ...(applied.length ? { filters: applied, matchType } : {}),
            });
            const first = response.data?.data?.[0];
            setRows(first?.data ?? []);
            setTotalRows(first?.count ?? 0);
        } catch (error) {
            console.error("Error loading the audit log:", error);
            setRows([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNo, perPage, column, sortDirection, query, applied, matchType]);

    useEffect(() => {
        getAuditedModels()
            .then((response) =>
                setLookups({
                    models: (response.data.data ?? []).map((name) => ({ value: name, label: name })),
                }),
            )
            .catch((error) => console.error("Error loading audited models:", error));
    }, []);

    const openDetail = async (row) => {
        try {
            const response = await getAuditLogById(row._id);
            setDetail(response.data.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not load that entry");
        }
    };

    const columns = useMemo(
        () => [
            {
                name: "When",
                minWidth: "170px",
                sortable: true,
                sortField: "createdAt",
                selector: (row) => formatDate(row.createdAt),
            },
            {
                name: "Changed by",
                minWidth: "190px",
                sortable: true,
                sortField: "actor.name",
                selector: (row) => (
                    <div className="min-w-0">
                        <p className="truncate text-sm text-primary">{row.actor?.name || "Unknown"}</p>
                        <p className="truncate text-xs text-tertiary">{row.actor?.email}</p>
                    </div>
                ),
            },
            {
                name: "Action",
                maxWidth: "130px",
                sortable: true,
                sortField: "action",
                selector: (row) => {
                    const style = ACTION_STYLE[row.action] ?? ACTION_STYLE.update;
                    return (
                        <Badge color={style.color} size="sm">
                            {style.label}
                        </Badge>
                    );
                },
            },
            {
                name: "Record",
                minWidth: "230px",
                sortable: true,
                sortField: "model",
                selector: (row) => (
                    <div className="min-w-0">
                        <p className="truncate text-sm text-primary">{row.recordLabel || "—"}</p>
                        <p className="truncate text-xs text-tertiary">{row.model}</p>
                    </div>
                ),
            },
            {
                name: "Fields changed",
                maxWidth: "150px",
                selector: (row) =>
                    row.changes?.length ? (
                        <span className="text-sm text-secondary">
                            {row.changes.length === 1
                                ? row.changes[0].field
                                : `${row.changes.length} fields`}
                        </span>
                    ) : (
                        <span className="text-sm text-quaternary">—</span>
                    ),
            },
            {
                name: "Action",
                maxWidth: "90px",
                selector: (row) => (
                    <ButtonUtility
                        size="xs"
                        color="tertiary"
                        icon={Eye}
                        tooltip="See what changed"
                        aria-label="See what changed"
                        onClick={() => openDetail(row)}
                    />
                ),
            },
        ],
        [],
    );

    document.title = "Audit Log | Demo Panel";

    if (!currentPagePermissions.read) {
        return (
            <>
                <PageHeader title="Audit Log" pageTitle="Master" />
                <Card className="px-5 py-8 text-center">
                    <p className="text-sm text-tertiary">You do not have access to the audit log.</p>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Audit Log"
                pageTitle="Master"
                description="Every change made through the panel, and who made it. Written automatically and never editable."
                setQuery={setQuery}
                searchPlaceholder="Search records or people..."
                actions={
                    <>
                        <Button color="secondary" iconLeading={FilterLines} onClick={() => setShowFilters((open) => !open)}>
                            Filters
                            {applied.length > 0 && (
                                <Badge color="brand" size="sm">
                                    {applied.length}
                                </Badge>
                            )}
                        </Button>
                        <Button color="secondary" iconLeading={RefreshCw01} onClick={fetchRows}>
                            Refresh
                        </Button>
                    </>
                }
            />

            {showFilters && (
                <FilterPanel
                    fields={FILTER_FIELDS}
                    rows={draft.rows}
                    matchType={draft.matchType}
                    lookups={lookups}
                    onChange={(next, nextMatch) => setDraft({ rows: next, matchType: nextMatch ?? draft.matchType })}
                    onApply={() => {
                        setPageNo(1);
                        setApplied(draft.rows);
                        setMatchType(draft.matchType);
                    }}
                    onReset={() => {
                        setDraft({ rows: [], matchType: "all" });
                        setPageNo(1);
                        setApplied([]);
                        setMatchType("all");
                    }}
                    onClose={() => setShowFilters(false)}
                />
            )}

            <Card>
                <DataTable
                    ariaLabel="Audit log"
                    columns={columns}
                    data={rows}
                    progressPending={loading}
                    noDataComponent="Nothing recorded yet. Changes made through the panel appear here automatically."
                    onSort={(col, direction) => {
                        setColumn(col.sortField);
                        setSortDirection(direction);
                    }}
                    paginationTotalRows={totalRows}
                    paginationPerPage={10}
                    paginationRowsPerPageOptions={[10, 25, 50, 100]}
                    onChangeRowsPerPage={setPerPage}
                    onChangePage={setPageNo}
                />
            </Card>

            <FormModal
                isOpen={Boolean(detail)}
                onClose={() => setDetail(null)}
                title="What changed"
                size="lg"
            >
                {detail && (
                    <>
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-secondary px-4 py-3 sm:grid-cols-4">
                            {[
                                ["Record", detail.recordLabel || detail.model],
                                ["Type", detail.model],
                                ["Changed by", detail.actor?.name || "Unknown"],
                                ["When", formatDate(detail.createdAt)],
                            ].map(([label, value]) => (
                                <div key={label} className="min-w-0">
                                    <p className="text-xs text-tertiary">{label}</p>
                                    <p className="truncate text-sm font-medium text-primary">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-tertiary">
                            <Badge color={(ACTION_STYLE[detail.action] ?? ACTION_STYLE.update).color} size="sm">
                                {(ACTION_STYLE[detail.action] ?? ACTION_STYLE.update).label}
                            </Badge>
                            {detail.actor?.email && <span>{detail.actor.email}</span>}
                            {detail.actor?.role && <span>· {detail.actor.role}</span>}
                            {detail.ip && <span>· from {detail.ip}</span>}
                        </div>

                        {detail.changes?.length ? (
                            <div className="overflow-x-auto rounded-lg ring-1 ring-secondary">
                                <table className="w-full text-sm">
                                    <thead className="bg-secondary">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-tertiary">Field</th>
                                            <th className="px-3 py-2 text-left font-medium text-tertiary">Before</th>
                                            <th className="px-3 py-2 text-left font-medium text-tertiary">After</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detail.changes.map((change, index) => (
                                            <tr key={change.field} className={cx(index > 0 && "border-t border-secondary")}>
                                                <td className="px-3 py-2 align-top font-mono text-xs text-secondary">
                                                    {change.field}
                                                </td>
                                                <td className="px-3 py-2 align-top text-tertiary">
                                                    <Value value={change.from} />
                                                </td>
                                                <td className="px-3 py-2 align-top text-primary">
                                                    <Value value={change.to} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-tertiary">
                                {detail.action === "delete"
                                    ? "The record was deleted. Its earlier changes are still listed above in the log."
                                    : "No field-level detail was recorded for this entry."}
                            </p>
                        )}

                        <p className="text-xs text-quaternary">
                            Passwords and keys are recorded as changed, never as values.
                        </p>
                    </>
                )}
            </FormModal>
        </>
    );
};

export default AuditLog;

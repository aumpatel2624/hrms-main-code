import { useContext, useEffect, useMemo, useState } from "react";
import { FilterLines, RefreshCw01 } from "@untitledui/icons";
import { MenuContext } from "../../context/MenuContext";
import { searchLeaveLedgerEntries } from "../../api/leaves.api";
import DataTable from "@/components/ui/data-table";
import FilterPanel from "@/components/ui/filter-panel";
import { Card, PageHeader } from "@/components/ui/page";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";

/**
 * ADR-024: LeaveLedgerEntry is append-only and system-written (by
 * grant-allocations/adjust here, and by the second fork's Application/
 * Encashment/Adjustment actions) — there is no create/update/delete
 * endpoint at all. A custom page rather than an entity config, same
 * reasoning as pages/Master/AuditLog.jsx: a generated CRUD screen would
 * offer add/edit/delete, and this collection must never allow any of them.
 */

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const FILTER_FIELDS = [
    { name: "employeeId", label: "Employee", type: "objectId" },
    { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
    {
        name: "transactionType",
        label: "Transaction Type",
        type: "enum",
        options: ["LeaveAllocation", "LeavePolicyAssignment", "LeaveApplication", "LeaveEncashment", "LeaveAdjustment"].map((v) => ({ value: v, label: v })),
    },
    { name: "isCarryForward", label: "Carry Forward", type: "boolean" },
    { name: "isExpired", label: "Expired", type: "boolean" },
    { name: "createdAt", label: "Created", type: "date" },
];

const LeaveLedgerEntries = () => {
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

    const fetchRows = async () => {
        setLoading(true);
        try {
            const response = await searchLeaveLedgerEntries({
                skip: Math.max((pageNo - 1) * perPage, 0),
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
                ...(applied.length ? { filters: applied, matchType } : {}),
            });
            const first = response.data?.data?.[0];
            setRows(first?.data ?? []);
            setTotalRows(first?.count ?? 0);
        } catch (error) {
            console.error("Error loading the leave ledger:", error);
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

    const columns = useMemo(
        () => [
            { name: "Date", minWidth: "110px", sortable: true, sortField: "createdAt", selector: (row) => formatDate(row.createdAt) },
            { name: "Employee", minWidth: "170px", selector: (row) => row.employeeName || "—" },
            { name: "Leave Type", minWidth: "150px", selector: (row) => row.leaveTypeName || "—" },
            { name: "Transaction", minWidth: "150px", sortable: true, sortField: "transactionType", selector: (row) => row.transactionType },
            {
                name: "Leaves",
                maxWidth: "110px",
                sortable: true,
                sortField: "leaves",
                selector: (row) => (
                    <span className={row.leaves >= 0 ? "font-medium text-success-primary" : "font-medium text-error-primary"}>
                        {row.leaves > 0 ? `+${row.leaves}` : row.leaves}
                    </span>
                ),
            },
            { name: "Period", minWidth: "180px", selector: (row) => `${formatDate(row.fromDate)} → ${formatDate(row.toDate)}` },
            {
                name: "Flags",
                minWidth: "160px",
                selector: (row) => (
                    <div className="flex flex-wrap gap-1">
                        {row.isCarryForward && <Badge size="sm" color="brand">Carry Forward</Badge>}
                        {row.isExpired && <Badge size="sm" color="warning">Expired</Badge>}
                        {row.isLwp && <Badge size="sm" color="gray">LWP</Badge>}
                    </div>
                ),
            },
        ],
        [],
    );

    document.title = "Leave Ledger | Demo Panel";

    if (!currentPagePermissions.read) {
        return (
            <>
                <PageHeader title="Leave Ledger" pageTitle="Leaves" />
                <Card className="px-5 py-8 text-center">
                    <p className="text-sm text-tertiary">You do not have access to the leave ledger.</p>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Leave Ledger"
                pageTitle="Leaves"
                description="Every leave balance movement — allocation, adjustment, and (once built) application/encashment. Written automatically and never editable; balance is always the sum of this table."
                setQuery={setQuery}
                searchPlaceholder="Search..."
                actions={
                    <>
                        <Button color="secondary" iconLeading={FilterLines} onClick={() => setShowFilters((open) => !open)}>
                            Filters
                            {applied.length > 0 && <Badge color="brand" size="sm">{applied.length}</Badge>}
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
                    ariaLabel="Leave ledger"
                    columns={columns}
                    data={rows}
                    progressPending={loading}
                    noDataComponent="No ledger entries yet. Grant a Leave Policy Assignment's allocations, or adjust an allocation, to see one."
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
        </>
    );
};

export default LeaveLedgerEntries;

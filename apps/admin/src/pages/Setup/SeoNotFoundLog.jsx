import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowRight, CheckCircle, RefreshCw01 } from "@untitledui/icons";
import { REDIRECT_STATUSES } from "@demo-panel/shared/seo";
import { MenuContext } from "../../context/MenuContext";
import { deleteSeoNotFound, redirectSeoNotFound, searchSeoNotFound } from "../../api/seo.api";
import DataTable from "@/components/ui/data-table";
import { Card, PageHeader, RowActions } from "@/components/ui/page";
import { ConfirmModal, FormFooter, FormModal } from "@/components/ui/modal";
import { Field, SelectField } from "@/components/ui/field";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";

/**
 * URLs the public website was asked for and could not serve.
 *
 * Not a CRUD screen: the point of this list is the "Fix" action, which turns a
 * logged 404 into a redirect and ticks the row off in one step. A log you can
 * only read tells you something is broken; this one lets you mend it.
 */

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

const STATUS_LABELS = {
    301: "301 — moved permanently",
    302: "302 — moved temporarily",
    307: "307 — temporary, keeps the method",
    308: "308 — permanent, keeps the method",
    410: "410 — gone for good, no destination",
};

const SeoNotFoundLog = () => {
    const { currentPagePermissions } = useContext(MenuContext);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [column, setColumn] = useState("lastSeenAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [query, setQuery] = useState("");
    const [showResolved, setShowResolved] = useState(false);

    const [fixing, setFixing] = useState(null);
    const [fixForm, setFixForm] = useState({ toPath: "", statusCode: 301 });
    const [fixSaving, setFixSaving] = useState(false);
    const [removing, setRemoving] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchRows = async () => {
        setLoading(true);
        try {
            const response = await searchSeoNotFound({
                skip: Math.max((pageNo - 1) * perPage, 0),
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
                isActive: true,
                // Unresolved first by default — the list is a work queue, not
                // an archive of everything that ever 404'd.
                ...(showResolved ? {} : { filters: [{ field: "isResolved", op: "eq", value: false }], matchType: "all" }),
            });
            const first = response.data?.data?.[0];
            setRows(first?.data ?? []);
            setTotalRows(first?.count ?? 0);
        } catch (error) {
            console.error("Error loading 404 log:", error);
            setRows([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNo, perPage, column, sortDirection, query, showResolved]);

    const submitFix = async () => {
        setFixSaving(true);
        try {
            await redirectSeoNotFound(fixing._id, {
                toPath: fixForm.toPath,
                statusCode: Number(fixForm.statusCode),
            });
            toast.success("Redirect created — the next visitor will be sent to the new page");
            setFixing(null);
            fetchRows();
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not create the redirect");
        } finally {
            setFixSaving(false);
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteSeoNotFound(removing._id);
            toast.success("Entry removed");
            setRemoving(null);
            fetchRows();
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not remove that entry");
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                name: "Path",
                minWidth: "260px",
                sortable: true,
                sortField: "path",
                selector: (row) => <span className="font-mono text-sm text-primary">{row.path}</span>,
            },
            {
                name: "Times hit",
                maxWidth: "120px",
                sortable: true,
                sortField: "hits",
                selector: (row) => <span className="tabular-nums">{row.hits}</span>,
            },
            {
                name: "Last seen",
                minWidth: "180px",
                sortable: true,
                sortField: "lastSeenAt",
                selector: (row) => formatDate(row.lastSeenAt),
            },
            {
                name: "Came from",
                minWidth: "220px",
                selector: (row) =>
                    row.lastReferrer ? (
                        <span className="truncate text-sm text-tertiary">{row.lastReferrer}</span>
                    ) : (
                        <span className="text-sm text-quaternary">Typed or unknown</span>
                    ),
            },
            {
                name: "Status",
                maxWidth: "140px",
                selector: (row) =>
                    row.isResolved ? (
                        <Badge color="success" size="sm">Redirected</Badge>
                    ) : (
                        <Badge color="warning" size="sm">Needs a fix</Badge>
                    ),
            },
            {
                name: "Action",
                minWidth: "150px",
                selector: (row) => (
                    <div className="flex items-center gap-1">
                        {!row.isResolved && currentPagePermissions.write && (
                            <Button
                                size="sm"
                                color="secondary"
                                iconLeading={ArrowRight}
                                onClick={() => {
                                    setFixing(row);
                                    setFixForm({ toPath: "", statusCode: 301 });
                                }}
                            >
                                Fix
                            </Button>
                        )}
                        <RowActions
                            canDelete={currentPagePermissions.delete}
                            onRemove={() => setRemoving(row)}
                        />
                    </div>
                ),
            },
        ],
        [currentPagePermissions],
    );

    document.title = "404 Log | Demo Panel";

    return (
        <>
            <PageHeader
                title="404 Log"
                pageTitle="Setup"
                description="URLs your website was asked for and could not serve. Every one is a visitor who hit a dead end."
                setQuery={setQuery}
                searchPlaceholder="Search paths..."
                actions={
                    <>
                        <Button
                            color="secondary"
                            iconLeading={showResolved ? CheckCircle : RefreshCw01}
                            onClick={() => {
                                setPageNo(1);
                                setShowResolved((shown) => !shown);
                            }}
                        >
                            {showResolved ? "Showing all" : "Showing unfixed"}
                        </Button>
                        <Button color="secondary" iconLeading={RefreshCw01} onClick={fetchRows}>
                            Refresh
                        </Button>
                    </>
                }
            />

            <Card>
                <DataTable
                    ariaLabel="404 log"
                    columns={columns}
                    data={rows}
                    progressPending={loading}
                    noDataComponent={
                        showResolved
                            ? "Nothing logged yet. Your website reports 404s here once it is wired up."
                            : "No broken links waiting — everything logged has been redirected."
                    }
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
                isOpen={Boolean(fixing)}
                onClose={() => setFixing(null)}
                title="Send this URL somewhere else"
                footer={
                    <FormFooter
                        onCancel={() => setFixing(null)}
                        onSubmit={submitFix}
                        isLoading={fixSaving}
                        submitLabel="Create redirect"
                        loadingLabel="Creating..."
                    />
                }
            >
                <div className="rounded-lg bg-secondary px-4 py-3">
                    <p className="text-xs text-tertiary">Visitors asking for</p>
                    <p className="font-mono text-sm text-primary">{fixing?.path}</p>
                </div>

                <SelectField
                    label="What kind of move is this?"
                    options={REDIRECT_STATUSES.map((code) => ({ value: code, label: STATUS_LABELS[code] }))}
                    value={fixForm.statusCode}
                    onChange={(option) => option && setFixForm((prev) => ({ ...prev, statusCode: option.value }))}
                    hint="Use 301 unless the page is coming back."
                />

                {Number(fixForm.statusCode) !== 410 && (
                    <Field
                        label="Send them to"
                        name="toPath"
                        placeholder="/the-new-page"
                        hint="A path on your site, or a full URL to send them elsewhere."
                        value={fixForm.toPath}
                        onChange={(event) => setFixForm((prev) => ({ ...prev, toPath: event.target.value }))}
                    />
                )}
            </FormModal>

            <ConfirmModal
                isOpen={Boolean(removing)}
                onClose={() => setRemoving(null)}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                title="Remove this log entry?"
                description="It will come back the next time someone hits the same broken URL."
            />
        </>
    );
};

export default SeoNotFoundLog;

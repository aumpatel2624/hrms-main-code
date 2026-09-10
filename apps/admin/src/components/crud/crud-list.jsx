import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import DataTable from "@/components/ui/data-table";
import ReferenceErrorModal from "@/components/ui/reference-error-modal";
import DeleteBlockedModal from "@/components/ui/delete-blocked-modal";
import { ConfirmModal } from "@/components/ui/modal";
import { Card, PageHeader, RowActions } from "@/components/ui/page";
import FilterPanel from "@/components/ui/filter-panel";
import ColumnMenu from "@/components/ui/column-menu";
import { useTablePrefs } from "@/components/ui/table-prefs";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { FilterLines } from "@untitledui/icons";

/**
 * The list screen for a CRUD entity. Add/edit/view are separate routes now, so
 * this only lists, searches, filters and deletes.
 */
const CrudList = ({ config }) => {
    const { currentPagePermissions } = useContext(MenuContext);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [pageNo, setPageNo] = useState(0);
    const [column, setColumn] = useState();
    const [sortDirection, setSortDirection] = useState();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState(true);

    // Column layout and the last-used filters persist per entity.
    const [prefs, setPrefs, resetPrefs] = useTablePrefs(config.key, {
        hidden: [], order: [], widths: {}, filters: [], matchType: "all",
    });
    const [showFilters, setShowFilters] = useState(false);
    const [draft, setDraft] = useState({ rows: prefs.filters ?? [], matchType: prefs.matchType ?? "all" });
    const [lookups, setLookups] = useState({});

    const filterFields = config.filterFields ?? [];
    const appliedFilters = prefs.filters ?? [];

    const [removeId, setRemoveId] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Two different "you can't delete this" flows exist in this API: a 409 with
    // reference details, and a 200 with isOk:false plus a list of dependents.
    const [referenceData, setReferenceData] = useState(null);
    const [blocked, setBlocked] = useState(null);

    const fetchRows = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) skip = 0;

        try {
            const response = await config.api.search({
                skip,
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
                isActive: filter,
                ...(appliedFilters.length ? { filters: appliedFilters, matchType: prefs.matchType ?? "all" } : {}),
            });
            const first = response.data?.data?.[0];
            setRows(first?.data ?? []);
            setTotalRows(first?.count ?? 0);
        } catch (err) {
            console.log(err);
            setRows([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNo, perPage, column, sortDirection, query, filter, appliedFilters, prefs.matchType]);

    // Option lists for filter rows that pick a related record.
    useEffect(() => {
        Object.entries(config.filterLookups ?? {}).forEach(([key, loader]) => {
            loader()
                .then((options) => setLookups((prev) => ({ ...prev, [key]: options })))
                .catch((err) => console.log(err));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async (e) => {
        e.preventDefault();
        setIsDeleting(true);
        try {
            const res = await config.api.remove(removeId);
            if (res?.data && res.data.isOk === false) {
                setConfirmOpen(false);
                setBlocked({ message: res.data.message, services: res.data.data });
                return;
            }
            setConfirmOpen(false);
            toast.success(`${config.singular} removed successfully`);
            fetchRows();
        } catch (err) {
            console.log(err);
            setConfirmOpen(false);
            if (err.response?.status === 409) {
                setReferenceData(err.response.data);
            } else {
                toast.error(`Failed to delete ${config.singular.toLowerCase()}. Please try again.`);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const allColumns = [
        { name: "Sr No", selector: (row, index) => index + 1, sortable: true, maxWidth: "80px" },
        ...config.columns,
        {
            name: "Action",
            minWidth: "130px",
            selector: (row) => (
                <RowActions
                    canEdit={currentPagePermissions.edit}
                    canDelete={currentPagePermissions.delete}
                    onView={() => navigate(`${config.path}/${row._id}`)}
                    onEdit={() => navigate(`${config.path}/${row._id}/edit`)}
                    onRemove={() => {
                        setRemoveId(row._id);
                        setConfirmOpen(true);
                    }}
                />
            ),
        },
    ];

    // Hidden and reordered columns. The action column always stays last.
    const orderable = allColumns.filter((c) => c.name !== "Action");
    const actionColumn = allColumns.find((c) => c.name === "Action");
    const ordered = prefs.order?.length
        ? [...orderable].sort((a, b) => {
              const ai = prefs.order.indexOf(a.name);
              const bi = prefs.order.indexOf(b.name);
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          })
        : orderable;
    const columns = [...ordered.filter((c) => !(prefs.hidden ?? []).includes(c.name)), actionColumn].filter(Boolean);

    document.title = `${config.plural} | Demo Panel`;

    return (
        <>
            <PageHeader
                title={config.plural}
                pageTitle={config.section}
                description={config.description}
                filter={filter}
                handleFilter={(e) => {
                    setPageNo(1);
                    setFilter(e.target.checked);
                }}
                setQuery={setQuery}
                tog_list={() => navigate(`${config.path}/add`)}
                showAddButton={currentPagePermissions.write}
                addLabel={`Add ${config.singular}`}
                actions={
                    <>
                        {filterFields.length > 0 && (
                            <Button
                                color="secondary"
                                iconLeading={FilterLines}
                                onClick={() => setShowFilters((open) => !open)}
                            >
                                Filters
                                {appliedFilters.length > 0 && (
                                    <Badge color="brand" size="sm">
                                        {appliedFilters.length}
                                    </Badge>
                                )}
                            </Button>
                        )}
                        <ColumnMenu
                            columns={orderable}
                            hidden={prefs.hidden ?? []}
                            order={prefs.order ?? []}
                            onChange={setPrefs}
                            onReset={resetPrefs}
                        />
                    </>
                }
            />

            {showFilters && (
                <FilterPanel
                    fields={filterFields}
                    rows={draft.rows}
                    matchType={draft.matchType}
                    lookups={lookups}
                    onChange={(rows, matchType) => setDraft({ rows, matchType: matchType ?? draft.matchType })}
                    onApply={() => {
                        setPageNo(1);
                        setPrefs({ filters: draft.rows, matchType: draft.matchType });
                    }}
                    onReset={() => {
                        setDraft({ rows: [], matchType: "all" });
                        setPageNo(1);
                        setPrefs({ filters: [], matchType: "all" });
                    }}
                    onClose={() => setShowFilters(false)}
                />
            )}

            <Card>
                <DataTable
                    ariaLabel={config.plural}
                    columns={columns}
                    data={rows}
                    progressPending={loading}
                    onSort={(col, direction) => {
                        setColumn(col.sortField);
                        setSortDirection(direction);
                    }}
                    paginationTotalRows={totalRows}
                    paginationPerPage={10}
                    paginationRowsPerPageOptions={[10, 25, 50, 100]}
                    onChangeRowsPerPage={setPerPage}
                    onChangePage={setPageNo}
                    widths={prefs.widths ?? {}}
                    onResize={(name, width) => setPrefs((prev) => ({ widths: { ...prev.widths, [name]: width } }))}
                />
            </Card>

            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                isLoading={isDeleting}
                description={`Are you sure you want to remove this ${config.singular.toLowerCase()}?`}
            />

            <ReferenceErrorModal
                isOpen={Boolean(referenceData)}
                toggle={() => setReferenceData(null)}
                title={`Cannot Delete ${config.singular}`}
                referenceData={referenceData}
            />

            <DeleteBlockedModal
                isOpen={Boolean(blocked)}
                toggle={() => setBlocked(null)}
                title={`Unable to Delete ${config.singular}`}
                message={blocked?.message}
                services={blocked?.services}
            />
        </>
    );
};

export default CrudList;

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    BarChart03,
    BarChartSquare01,
    Edit01,
    Hash02,
    HelpCircle,
    LayoutAlt01,
    LineChartUp01,
    PieChart01,
    Plus,
    Save01,
    Table,
    Target04,
    TrendUp01,
    Trash01,
    XClose,
} from "@untitledui/icons";
import { MenuContext } from "../../context/MenuContext";
import { getAllRoles } from "../../api/roles.api";
import { listWidgets, deleteWidget, getRoleDashboard, saveRoleDashboard, runWidget } from "../../api/dashboards.api";
import { Card, PageHeader } from "@/components/ui/page";
import { SelectField } from "@/components/ui/field";
import { ConfirmModal } from "@/components/ui/modal";
import ReferenceErrorModal from "@/components/ui/reference-error-modal";
import { DashboardCanvas, defaultSizeFor } from "@/components/ui/dashboard-canvas";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

/**
 * The Dashboard Builder's home (ADR-003): the library of saved sections, and the
 * panel that pins them to each role's dashboard.
 *
 * Building a section is its own screen — /dashboard-builder/add and
 * /dashboard-builder/edit/:id (DashboardSectionEditor) — because the live preview
 * beside the inputs needs the room.
 */

const CHART_LABELS = {
    stat: "Stat tile",
    bar: "Bar chart",
    barHorizontal: "Bar (horizontal)",
    line: "Line chart",
    area: "Area chart",
    pie: "Pie chart",
    donut: "Donut chart",
    radar: "Radar chart",
    radial: "Radial chart",
    table: "Table",
};
const CHART_ICONS = {
    stat: Hash02,
    bar: BarChart03,
    barHorizontal: BarChartSquare01,
    line: LineChartUp01,
    area: TrendUp01,
    pie: PieChart01,
    donut: PieChart01,
    radar: Target04,
    radial: Target04,
    table: Table,
};
const DEFAULT_DASHBOARD = "default";

/** One numbered instruction in the "how this page works" strip. */
const HowToStep = ({ number, title, text }) => (
    <div className="flex gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-brand-secondary ring-1 ring-brand">
            {number}
        </span>
        <div className="min-w-0">
            <p className="text-sm font-medium text-primary">{title}</p>
            <p className="mt-0.5 text-xs text-tertiary">{text}</p>
        </div>
    </div>
);

const DashboardBuilder = () => {
    const navigate = useNavigate();
    const { currentPagePermissions } = useContext(MenuContext);
    const canWrite = Boolean(currentPagePermissions?.write);
    const canEdit = Boolean(currentPagePermissions?.edit);
    const canDelete = Boolean(currentPagePermissions?.delete);

    const [loading, setLoading] = useState(true);
    const [widgets, setWidgets] = useState([]);
    const [tab, setTab] = useState("sections");
    const [showHowTo, setShowHowTo] = useState(true);

    const [deleting, setDeleting] = useState(null);
    const [referenceData, setReferenceData] = useState(null);

    const [roles, setRoles] = useState([]);
    const [dashRole, setDashRole] = useState(null);
    const [pins, setPins] = useState([]);
    const [dashSaving, setDashSaving] = useState(false);
    // Live results per pinned widget, so the canvas shows the real chart
    // rather than a placeholder — it is meant to look like the dashboard.
    const [pinResults, setPinResults] = useState({});

    const refreshWidgets = async () => {
        const response = await listWidgets();
        if (response.data.isOk) setWidgets(response.data.data);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [, rolesRes] = await Promise.all([refreshWidgets(), getAllRoles()]);
                setRoles((rolesRes.data.data ?? []).map((role) => ({ value: role._id, label: role.roleName })));
            } catch (error) {
                console.error("Error loading the dashboard builder:", error);
                toast.error("Failed to load the dashboard builder");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const confirmDelete = async () => {
        const widget = deleting;
        setDeleting(null);
        try {
            await deleteWidget(widget._id);
            toast.success("Section deleted");
            await refreshWidgets();
        } catch (error) {
            if (error.response?.status === 409) {
                setReferenceData(error.response.data);
            } else {
                toast.error(error.response?.data?.message || "Delete failed");
            }
        }
    };

    // ---- dashboards panel -------------------------------------------------

    const dashRoleOptions = [{ value: DEFAULT_DASHBOARD, label: "Default (Admin)" }, ...roles];

    const loadDashboard = async (option) => {
        setDashRole(option);
        if (!option) {
            setPins([]);
            return;
        }
        try {
            const response = await getRoleDashboard(option.value === DEFAULT_DASHBOARD ? null : option.value);
            const dashboard = response.data.data;
            const loaded = (dashboard?.widgets ?? []).map((pin) => ({
                widgetId: pin.widgetId._id,
                title: pin.widgetId.title,
                chartType: pin.widgetId.chartType,
                size: pin.size,
            }));
            setPins(loaded);
            loadResults(loaded.map((pin) => pin.widgetId));
        } catch (error) {
            console.error("Error loading dashboard:", error);
            toast.error("Failed to load that dashboard");
        }
    };

    /**
     * Run each widget once so the canvas can draw it. Fired per id rather than
     * awaited as a batch: one slow aggregation should not hold up the rest of
     * the canvas.
     */
    const loadResults = (ids) => {
        ids.forEach(async (id) => {
            if (pinResults[id]) return;
            try {
                const run = await runWidget(id);
                setPinResults((prev) => ({ ...prev, [id]: { result: run.data?.data } }));
            } catch (error) {
                const details = error.response?.data?.details;
                setPinResults((prev) => ({
                    ...prev,
                    [id]: { error: Array.isArray(details) ? details.join(" · ") : "This section could not be run" },
                }));
            }
        });
    };

    const addPin = (option) => {
        if (!option || pins.some((pin) => pin.widgetId === option.value)) return;
        const widget = widgets.find((entry) => entry._id === option.value);
        // A stat tile is one number, so it starts one column wide rather than
        // two — four fit on a row. An existing pin keeps its saved width.
        setPins([
            ...pins,
            {
                widgetId: option.value,
                title: widget?.title ?? option.label,
                chartType: widget?.chartType,
                size: defaultSizeFor(widget?.chartType),
            },
        ]);
        loadResults([option.value]);
    };

    const saveDashboard = async () => {
        if (!dashRole) return;
        setDashSaving(true);
        try {
            await saveRoleDashboard({
                roleId: dashRole.value === DEFAULT_DASHBOARD ? null : dashRole.value,
                widgets: pins.map((pin, index) => ({ widgetId: pin.widgetId, sequence: index, size: pin.size })),
            });
            toast.success("Dashboard saved");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save dashboard");
        } finally {
            setDashSaving(false);
        }
    };

    document.title = `Dashboard Builder | Demo Panel`;

    if (loading) {
        return (
            <>
                <PageHeader title="Dashboard Builder" pageTitle="Setup" />
                <div className="flex justify-center py-16">
                    <LoadingIndicator type="dot-circle" size="md" label="Loading..." />
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader title="Dashboard Builder" pageTitle="Setup" />

            {/* Tabs: building sections and arranging dashboards are two jobs. */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1 rounded-lg bg-secondary p-1">
                    {[
                        { key: "sections", label: "Sections", icon: BarChart03 },
                        { key: "dashboards", label: "Assign to dashboards", icon: LayoutAlt01 },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={cx(
                                "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                                tab === key ? "bg-primary text-primary shadow-xs ring-1 ring-secondary" : "text-tertiary hover:text-secondary",
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {!showHowTo && (
                        <Button size="sm" color="tertiary" iconLeading={HelpCircle} onClick={() => setShowHowTo(true)}>
                            How this page works
                        </Button>
                    )}
                    {tab === "sections" && canWrite && (
                        <Button iconLeading={Plus} onClick={() => navigate("/dashboard-builder/add")}>
                            New section
                        </Button>
                    )}
                </div>
            </div>

            {/* The whole page in three sentences. Dismissible, recallable. */}
            {showHowTo && (
                <Card className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-secondary">
                            A <span className="font-medium text-primary">section</span> is one chart or number built from your data. Build them
                            here, then choose which ones each role sees when they log in. Everyone only ever sees data their role is allowed to see.
                        </p>
                        <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Hide help" onClick={() => setShowHowTo(false)} />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <HowToStep number={1} title="Build a section" text={`Press "New section". Pick what to measure and how to draw it, with a live preview beside you.`} />
                        <HowToStep number={2} title="It lands here" text="Saved sections collect in this list. Click one to edit or delete it." />
                        <HowToStep number={3} title="Assign it" text={`Open "Assign to dashboards", pick a role, and pin the sections they should see.`} />
                    </div>
                </Card>
            )}

            {tab === "sections" ? (
                <Card>
                    <div className="border-b border-secondary px-5 py-4">
                        <h2 className="text-md font-semibold text-primary">Saved sections</h2>
                        <p className="text-xs text-tertiary">
                            {widgets.length === 0
                                ? "Nothing saved yet."
                                : `${widgets.length} section${widgets.length === 1 ? "" : "s"} in the library.`}
                        </p>
                    </div>

                    {widgets.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
                            <BarChart03 className="size-6 text-fg-quaternary" />
                            <p className="text-sm font-medium text-secondary">No sections yet</p>
                            <p className="max-w-80 text-xs text-tertiary">
                                A section is one chart or number — a total, a breakdown by department, a trend over time.
                            </p>
                            {canWrite && (
                                <Button className="mt-2" size="sm" iconLeading={Plus} onClick={() => navigate("/dashboard-builder/add")}>
                                    Build your first section
                                </Button>
                            )}
                        </div>
                    ) : (
                        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {widgets.map((widget) => {
                                const Icon = CHART_ICONS[widget.chartType] ?? BarChart03;
                                return (
                                    <li
                                        key={widget._id}
                                        className="group flex items-center gap-3 border-b border-r border-secondary px-5 py-3.5 last:border-b-0 hover:bg-secondary_hover"
                                    >
                                        <Icon className="size-4 shrink-0 text-fg-quaternary" />
                                        <button
                                            type="button"
                                            onClick={() => canEdit && navigate(`/dashboard-builder/edit/${widget._id}`)}
                                            disabled={!canEdit}
                                            className="min-w-0 flex-1 rounded-sm text-left outline-focus-ring focus-visible:outline-2 disabled:cursor-default"
                                        >
                                            <p className="truncate text-sm font-medium text-primary">{widget.title}</p>
                                            <p className="truncate text-xs text-tertiary">
                                                {CHART_LABELS[widget.chartType] ?? widget.chartType} · {widget.source}
                                            </p>
                                        </button>
                                        {canEdit && (
                                            <Button
                                                size="sm"
                                                color="tertiary"
                                                iconLeading={Edit01}
                                                aria-label={`Edit ${widget.title}`}
                                                onClick={() => navigate(`/dashboard-builder/edit/${widget._id}`)}
                                            />
                                        )}
                                        {canDelete && (
                                            <Button
                                                size="sm"
                                                color="tertiary"
                                                iconLeading={Trash01}
                                                aria-label={`Delete ${widget.title}`}
                                                onClick={() => setDeleting(widget)}
                                            />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            ) : (
                /* ---- Dashboards tab ---- */
                <Card>
                    <div className="flex flex-col gap-4 border-b border-secondary px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-md font-semibold text-primary">Assign sections to dashboards</h2>
                            <p className="text-xs text-tertiary">
                                Pick a role, then choose the sections its members see when they log in. A role with nothing pinned sees a plain greeting.
                            </p>
                        </div>
                        {canEdit && (
                            <Button iconLeading={Save01} onClick={saveDashboard} isLoading={dashSaving} isDisabled={!dashRole || dashSaving}>
                                Save dashboard
                            </Button>
                        )}
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SelectField
                                label="Whose dashboard?"
                                placeholder="Pick a role..."
                                hint={`"Default (Admin)" is what administrators see.`}
                                options={dashRoleOptions}
                                value={dashRole?.value ?? ""}
                                onChange={loadDashboard}
                            />
                            {dashRole && (
                                <SelectField
                                    label="Pin a section"
                                    placeholder="Add from the library..."
                                    hint="Pick one to add it to the list below."
                                    options={widgets
                                        .filter((widget) => !pins.some((pin) => pin.widgetId === widget._id))
                                        .map((widget) => ({ value: widget._id, label: widget.title }))}
                                    value=""
                                    onChange={addPin}
                                />
                            )}
                        </div>

                        {!dashRole ? (
                            <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-dashed border-secondary py-12 text-center">
                                <LayoutAlt01 className="size-6 text-fg-quaternary" />
                                <p className="text-sm font-medium text-secondary">Pick a role to begin</p>
                                <p className="max-w-72 text-xs text-tertiary">
                                    You will see what that role currently has pinned, and can add, reorder or remove sections.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="text-sm font-medium text-primary">
                                        {dashRole.label} sees {pins.length} section{pins.length === 1 ? "" : "s"}
                                    </p>
                                    {pins.length > 0 && canEdit && (
                                        <p className="text-xs text-tertiary">
                                            Drag a card to move it · drag any edge or corner to resize
                                        </p>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-tertiary">
                                    This is the dashboard as its viewers will see it. The layout stays responsive — cards
                                    reflow to one column on a phone.
                                </p>

                                <div className="mt-4">
                                    <DashboardCanvas
                                        pins={pins}
                                        results={pinResults}
                                        onChange={setPins}
                                        canEdit={canEdit}
                                    />
                                </div>

                                {pins.length > 0 && (
                                    <p className="mt-3 text-xs text-tertiary">Changes are not live until you press Save dashboard.</p>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <ConfirmModal
                isOpen={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete dashboard section"
                description={`Delete "${deleting?.title}"? Dashboards it is pinned to will block this.`}
                confirmLabel="Delete"
            />
            <ReferenceErrorModal
                isOpen={Boolean(referenceData)}
                toggle={() => setReferenceData(null)}
                title="Cannot delete section"
                referenceData={referenceData}
            />
        </>
    );
};

export default DashboardBuilder;

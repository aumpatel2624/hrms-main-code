import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
    ArrowLeft,
    BarChart03,
    BarChartSquare01,
    CheckCircle,
    ChevronDown,
    Hash02,
    LineChartUp01,
    PieChart01,
    Plus,
    Save01,
    Table,
    Target04,
    TrendUp01,
    Trash01,
} from "@untitledui/icons";
import {
    CHART_TYPES,
    METRIC_TYPES,
    DATE_RANGES,
    COLORABLE_CHART_TYPES,
    GROUPED_CHART_TYPES,
    TIME_SERIES_CHART_TYPES,
    SERIES_SLOTS,
} from "@demo-panel/shared/widgets";
import { MenuContext } from "../../context/MenuContext";
import { getWidgetSources, getWidgetById, createWidget, updateWidget, previewWidget } from "../../api/dashboards.api";
import { Card, PageHeader } from "@/components/ui/page";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { WidgetCard, slotColor } from "@/components/ui/widgets";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

/**
 * Add / edit one dashboard section (ADR-003). One component, two routes:
 * `mode="add"` at /dashboard-builder/add and `mode="edit"` at
 * /dashboard-builder/edit/:id — the same split as SeoPageEditor, and for the same
 * reason: the value of this screen is the live preview beside the inputs,
 * which an entity config cannot express.
 *
 * The list of saved sections lives on DashboardBuilder; this screen only ever
 * builds one.
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
const CHART_HINTS = {
    stat: "One big number — a total.",
    bar: "Compare amounts across a category.",
    barHorizontal: "Like a bar chart, but easier to read with long names.",
    line: "How a number changes over time.",
    area: "Like a line chart, with the area beneath it filled in.",
    pie: "Share of a whole per category.",
    donut: "A pie chart with the middle open.",
    radar: "Compare several categories on one shape.",
    radial: "Categories as rings — good for a handful of values.",
    table: "Plain rows of labels and values.",
};
const CHART_EXAMPLES = {
    stat: "e.g. how many users do we have in total?",
    bar: "e.g. how many users are in each department?",
    barHorizontal: "e.g. users per department, when the names are long.",
    line: "e.g. how many signups per day this month?",
    area: "e.g. signups per day, emphasising the volume.",
    pie: "e.g. what share of users is each role?",
    donut: "e.g. share per role, with room for a total in the middle.",
    radar: "e.g. how do departments compare across one measure?",
    radial: "e.g. progress-style rings, a few categories at most.",
    table: "e.g. a plain list of departments and their counts.",
};
const METRIC_LABELS = { count: "Count of records", sum: "Sum of a field", avg: "Average of a field" };
const RANGE_LABELS = { last7: "Last 7 days", last30: "Last 30 days", last90: "Last 90 days", last365: "Last year", all: "All time" };
const SLOT_NAMES = { 1: "Blue", 2: "Orange", 3: "Green", 4: "Amber", 5: "Pink", 6: "Forest", 7: "Indigo", 8: "Red" };

const EMPTY_FORM = {
    title: "",
    description: "",
    source: "",
    chartType: "stat",
    metricType: "count",
    metricField: "",
    groupBy: "",
    dateField: "",
    dateRange: "all",
    filters: [],
    seriesColors: {},
};

const asOptions = (labels, keys) => keys.map((key) => ({ value: key, label: labels[key] ?? key }));

/** A titled block; optional ones collapse so the form starts short. */
const Block = ({ title, help, children, collapsible = false, defaultOpen = true, summary, action }) => {
    const [open, setOpen] = useState(defaultOpen);
    const isOpen = collapsible ? open : true;

    return (
        <section className="border-b border-secondary last:border-b-0">
            <div className={cx("flex items-start justify-between gap-3 px-5", isOpen ? "pt-5 pb-3" : "py-4")}>
                <div className="min-w-0">
                    {collapsible ? (
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={isOpen}
                            className="flex items-center gap-1.5 rounded-sm text-left outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <ChevronDown className={cx("size-4 shrink-0 text-fg-quaternary transition-transform", !isOpen && "-rotate-90")} />
                            <h3 className="text-sm font-semibold text-primary">{title}</h3>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-tertiary">Optional</span>
                        </button>
                    ) : (
                        <h3 className="text-sm font-semibold text-primary">{title}</h3>
                    )}
                    {help && isOpen && <p className={cx("mt-1 text-xs text-tertiary", collapsible && "ml-5.5")}>{help}</p>}
                    {!isOpen && summary && <p className="ml-5.5 mt-0.5 text-xs text-tertiary">{summary}</p>}
                </div>
                {isOpen && action}
            </div>
            {isOpen && <div className="px-5 pb-5">{children}</div>}
        </section>
    );
};

/** The eight palette slots as swatches; `null` means "back to automatic". */
const ColorPicker = ({ value, onChange }) => (
    <div className="flex items-center gap-1">
        {SERIES_SLOTS.map((slot) => (
            <button
                key={slot}
                type="button"
                title={SLOT_NAMES[slot]}
                aria-label={SLOT_NAMES[slot]}
                aria-pressed={value === slot}
                onClick={() => onChange(value === slot ? null : slot)}
                className={cx(
                    "size-5 rounded-full ring-offset-2 ring-offset-[var(--color-bg-primary)] transition",
                    value === slot ? "ring-2 ring-brand" : "ring-1 ring-secondary hover:ring-brand",
                )}
                style={{ backgroundColor: slotColor(slot) }}
            />
        ))}
    </div>
);

const DashboardSectionEditor = ({ mode = "add" }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPagePermissions } = useContext(MenuContext);
    const canWrite = Boolean(currentPagePermissions?.write);
    const canEdit = Boolean(currentPagePermissions?.edit);
    const isEdit = mode === "edit";
    const allowed = isEdit ? canEdit : canWrite;

    const [loading, setLoading] = useState(true);
    const [sources, setSources] = useState([]);
    const [operators, setOperators] = useState({});
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState({ result: null, error: null, running: false });

    const source = sources.find((entry) => entry.key === form.source);

    useEffect(() => {
        const load = async () => {
            try {
                const sourcesRes = await getWidgetSources();
                const loadedSources = sourcesRes.data.data?.sources ?? [];
                setSources(loadedSources);
                setOperators(sourcesRes.data.data?.operators ?? {});

                if (isEdit && id) {
                    const response = await getWidgetById(id);
                    const widget = response.data.data;
                    setForm({
                        title: widget.title,
                        description: widget.description ?? "",
                        source: widget.source,
                        chartType: widget.chartType,
                        metricType: widget.metric?.type ?? "count",
                        metricField: widget.metric?.field ?? "",
                        groupBy: widget.groupBy ?? "",
                        dateField: widget.dateField ?? "",
                        dateRange: widget.dateRange ?? "all",
                        filters: (widget.filters ?? []).map((filter) => ({ field: filter.field, op: filter.op, value: filter.value })),
                        seriesColors: widget.seriesColors ?? {},
                    });
                } else {
                    // Start on the first source so the preview can appear at once.
                    setForm({ ...EMPTY_FORM, source: loadedSources[0]?.key ?? "" });
                }
            } catch (error) {
                console.error("Error loading the section editor:", error);
                toast.error(isEdit ? "Failed to load that section" : "Failed to load the builder");
                if (isEdit) navigate("/dashboard-builder");
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, mode]);

    const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const buildPayload = () => ({
        title: form.title,
        description: form.description,
        source: form.source,
        chartType: form.chartType,
        metric: { type: form.metricType, field: form.metricType === "count" ? null : form.metricField || null },
        groupBy: form.groupBy || null,
        dateField: form.dateField || null,
        dateRange: form.dateRange,
        filters: form.filters.filter((filter) => filter.field && filter.op),
        // Only the categories still on screen — a colour for a category that no
        // longer exists is dead weight the server would reject on chart change.
        seriesColors: COLORABLE_CHART_TYPES.includes(form.chartType) ? form.seriesColors : {},
    });

    /** Client-side gate before bothering the preview endpoint. */
    const missing = useMemo(() => {
        if (!form.source) return "Pick a data source to get started.";
        if (form.metricType !== "count" && !form.metricField) return "Pick which field to calculate.";
        if (GROUPED_CHART_TYPES.includes(form.chartType) && !form.groupBy)
            return `A ${CHART_LABELS[form.chartType].toLowerCase()} needs a "Group by" — pick one under "How should it look?".`;
        if (TIME_SERIES_CHART_TYPES.includes(form.chartType) && !form.dateField)
            return `A ${CHART_LABELS[form.chartType].toLowerCase()} needs a date field — pick one under "Time window".`;
        return null;
    }, [form]);
    const isRunnable = !missing;

    // Live preview: run the definition whenever it becomes runnable, debounced.
    const previewKey = JSON.stringify({ ...buildPayload(), title: null });
    const previewTimer = useRef(null);
    useEffect(() => {
        if (!isRunnable || !allowed) {
            setPreview({ result: null, error: null, running: false });
            return undefined;
        }
        setPreview((prev) => ({ ...prev, running: true }));
        previewTimer.current = setTimeout(async () => {
            try {
                const response = await previewWidget(buildPayload());
                setPreview({ result: response.data.data, error: null, running: false });
            } catch (error) {
                const details = error.response?.data?.details;
                setPreview({
                    result: null,
                    error: Array.isArray(details) ? details.join(" · ") : "Preview failed",
                    running: false,
                });
            }
        }, 600);
        return () => clearTimeout(previewTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewKey, isRunnable, allowed]);

    const save = async () => {
        if (!form.title.trim()) {
            toast.error("Give the section a name first");
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                await updateWidget(id, buildPayload());
                toast.success("Section updated");
            } else {
                await createWidget(buildPayload());
                toast.success("Section saved to the library");
            }
            navigate("/dashboard-builder");
        } catch (error) {
            const details = error.response?.data?.details;
            toast.error(Array.isArray(details) ? details.join(" · ") : error.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    // ---- filters editor ---------------------------------------------------

    const filterFieldOptions = Object.keys(source?.filterable ?? {}).map((field) => ({ value: field, label: field }));
    const opsFor = (field) => (operators[source?.filterable?.[field]] ?? []).map((op) => ({ value: op, label: op }));

    const setFilter = (index, patch) =>
        setField(
            "filters",
            form.filters.map((filter, i) => (i === index ? { ...filter, ...patch } : filter)),
        );

    const FilterValueInput = ({ filter, index }) => {
        const type = source?.filterable?.[filter.field];
        if (["isEmpty", "isNotEmpty"].includes(filter.op)) return null;
        if (type === "boolean") {
            return (
                <SelectField
                    aria-label="Filter value"
                    options={[
                        { value: "true", label: "Yes" },
                        { value: "false", label: "No" },
                    ]}
                    value={String(filter.value ?? "")}
                    onChange={(option) => option && setFilter(index, { value: option.value === "true" })}
                />
            );
        }
        return (
            <Field
                aria-label="Filter value"
                name={`filter-${index}`}
                type={type === "date" ? "date" : type === "number" ? "number" : "text"}
                value={filter.value ?? ""}
                onChange={(event) => setFilter(index, { value: event.target.value })}
            />
        );
    };

    document.title = `${isEdit ? "Edit" : "New"} dashboard section | Demo Panel`;

    if (loading) {
        return (
            <>
                <PageHeader title={isEdit ? "Edit section" : "New section"} pageTitle="Dashboard Builder" pageHref="/dashboard-builder" />
                <div className="flex justify-center py-16">
                    <LoadingIndicator type="dot-circle" size="md" label="Loading..." />
                </div>
            </>
        );
    }

    // The categories the preview actually returned — the colour list is built
    // from these, so the user only ever colours what is on screen.
    const categories = (preview.result?.rows ?? []).map((row) => {
        const label = row.label;
        if (label === null || label === undefined) return "—";
        if (label === true) return "Yes";
        if (label === false) return "No";
        return String(label);
    });
    const colorable = COLORABLE_CHART_TYPES.includes(form.chartType);

    const sentence = [
        METRIC_LABELS[form.metricType]?.toLowerCase() ?? form.metricType,
        source ? `from ${source.label}` : null,
        form.groupBy ? `grouped by ${source?.groupable?.[form.groupBy]?.label ?? form.groupBy}` : null,
        form.dateField && form.dateRange !== "all" ? RANGE_LABELS[form.dateRange]?.toLowerCase() : null,
        form.filters.filter((f) => f.field && f.op).length ? `${form.filters.filter((f) => f.field && f.op).length} filter(s)` : null,
    ]
        .filter(Boolean)
        .join(", ");

    const timeSummary = form.dateField
        ? `${source?.dateFields?.[form.dateField] ?? form.dateField} · ${RANGE_LABELS[form.dateRange]}`
        : "All time";
    const filterSummary = form.filters.filter((f) => f.field && f.op).length
        ? `${form.filters.filter((f) => f.field && f.op).length} applied`
        : "No filters — counting everything";
    const colorSummary = Object.keys(form.seriesColors ?? {}).length
        ? `${Object.keys(form.seriesColors).length} set by hand`
        : "Automatic";

    return (
        <>
            <PageHeader title={isEdit ? "Edit section" : "New section"} pageTitle="Dashboard Builder" pageHref="/dashboard-builder" />

            <div className="mt-5">
                <Button size="sm" color="tertiary" iconLeading={ArrowLeft} onClick={() => navigate("/dashboard-builder")}>
                    Back to all sections
                </Button>
            </div>

            <div className="mt-3 grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
                {/* ---- Builder ---- */}
                <Card className="mt-0 xl:col-span-7">
                    <div className="border-b border-secondary px-5 py-4">
                        <h2 className="text-md font-semibold text-primary">{isEdit ? "Edit this section" : "Build your section"}</h2>
                        <p className="text-xs text-tertiary">
                            {isEdit ? "Changes apply everywhere this section is pinned." : "Answer these to build your chart."}
                        </p>
                    </div>

                    <Block title="1. What do you want to measure?" help="Pick the records to look at and the number to work out.">
                        <div className="grid grid-cols-1 gap-4">
                            <SelectField
                                label="Data source"
                                hint="Which records to measure."
                                options={sources.map((entry) => ({ value: entry.key, label: entry.label }))}
                                value={form.source}
                                onChange={(option) => {
                                    if (!option) return;
                                    // A new source invalidates every field reference.
                                    setForm((prev) => ({
                                        ...EMPTY_FORM,
                                        title: prev.title,
                                        description: prev.description,
                                        chartType: prev.chartType,
                                        source: option.value,
                                    }));
                                }}
                            />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <SelectField
                                    label="Measure"
                                    options={asOptions(METRIC_LABELS, METRIC_TYPES).filter(
                                        (option) => option.value === "count" || Object.keys(source?.aggregatable ?? {}).length > 0,
                                    )}
                                    value={form.metricType}
                                    onChange={(option) => option && setField("metricType", option.value)}
                                />
                                {form.metricType !== "count" && (
                                    <SelectField
                                        label="Field to calculate"
                                        options={Object.entries(source?.aggregatable ?? {}).map(([field, label]) => ({ value: field, label }))}
                                        value={form.metricField}
                                        onChange={(option) => option && setField("metricField", option.value)}
                                    />
                                )}
                            </div>
                        </div>
                    </Block>

                    <Block title="2. How should it look?" help="Each shape answers a different kind of question.">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {CHART_TYPES.map((type) => {
                                const Icon = CHART_ICONS[type] ?? BarChart03;
                                const selected = form.chartType === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setField("chartType", type)}
                                        aria-pressed={selected}
                                        className={cx(
                                            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left ring-1 transition-colors",
                                            selected ? "bg-brand-primary ring-brand" : "ring-secondary hover:bg-secondary_hover",
                                        )}
                                    >
                                        <Icon className={cx("size-4 shrink-0", selected ? "text-brand-secondary" : "text-fg-quaternary")} />
                                        <span className={cx("text-xs font-medium", selected ? "text-brand-secondary" : "text-secondary")}>
                                            {CHART_LABELS[type]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-xs text-tertiary">
                            <span className="font-medium text-secondary">{CHART_HINTS[form.chartType]}</span> {CHART_EXAMPLES[form.chartType]}
                        </p>

                        {GROUPED_CHART_TYPES.includes(form.chartType) && (
                            <div className="mt-4">
                                <SelectField
                                    label="Group by"
                                    hint="One bar, slice or ring per value of this field."
                                    options={Object.entries(source?.groupable ?? {}).map(([field, def]) => ({ value: field, label: def.label }))}
                                    value={form.groupBy}
                                    onChange={(option) => option && setField("groupBy", option.value)}
                                />
                            </div>
                        )}
                    </Block>

                    {/* Colours only mean something once there are categories. */}
                    {colorable && (
                        <Block
                            title="Colours"
                            collapsible
                            defaultOpen={Object.keys(form.seriesColors ?? {}).length > 0}
                            summary={colorSummary}
                            help="Pick a colour per category, or leave it automatic."
                            action={
                                Object.keys(form.seriesColors ?? {}).length > 0 && (
                                    <Button size="sm" color="tertiary" onClick={() => setField("seriesColors", {})}>
                                        Reset to automatic
                                    </Button>
                                )
                            }
                        >
                            {categories.length === 0 ? (
                                <p className="rounded-lg bg-secondary px-4 py-3 text-xs text-tertiary">
                                    Finish the section above and the categories will appear here to colour.
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {categories.map((label) => (
                                        <li key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2">
                                            <span className="truncate text-sm text-primary">{label}</span>
                                            <ColorPicker
                                                value={form.seriesColors?.[label] ?? null}
                                                onChange={(slot) =>
                                                    setForm((prev) => {
                                                        const next = { ...(prev.seriesColors ?? {}) };
                                                        if (slot === null) delete next[label];
                                                        else next[label] = slot;
                                                        return { ...prev, seriesColors: next };
                                                    })
                                                }
                                            />
                                        </li>
                                    ))}
                                    <li className="pt-1 text-xs text-tertiary">
                                        Click a colour again to clear it. Categories left alone follow the automatic palette.
                                    </li>
                                </ul>
                            )}
                        </Block>
                    )}

                    <Block
                        title="Time window"
                        collapsible
                        defaultOpen={TIME_SERIES_CHART_TYPES.includes(form.chartType)}
                        summary={timeSummary}
                        help={
                            TIME_SERIES_CHART_TYPES.includes(form.chartType)
                                ? "The chart plots along this date field."
                                : "Limit the numbers to a recent period."
                        }
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <SelectField
                                label="Date field"
                                options={Object.entries(source?.dateFields ?? {}).map(([field, label]) => ({ value: field, label }))}
                                value={form.dateField}
                                onChange={(option) => option && setField("dateField", option.value)}
                            />
                            {form.dateField && (
                                <SelectField
                                    label="Date range"
                                    options={asOptions(RANGE_LABELS, DATE_RANGES)}
                                    value={form.dateRange}
                                    onChange={(option) => option && setField("dateRange", option.value)}
                                />
                            )}
                        </div>
                    </Block>

                    <Block
                        title="Filters"
                        collapsible
                        defaultOpen={form.filters.length > 0}
                        summary={filterSummary}
                        help="Narrow it down — e.g. only active records."
                        action={
                            <Button
                                size="sm"
                                color="tertiary"
                                iconLeading={Plus}
                                onClick={() => setField("filters", [...form.filters, { field: "", op: "", value: "" }])}
                            >
                                Add filter
                            </Button>
                        }
                    >
                        {form.filters.length === 0 && (
                            <p className="rounded-lg bg-secondary px-4 py-3 text-xs text-tertiary">
                                No filters — this counts every record in the source.
                            </p>
                        )}
                        {form.filters.map((filter, index) => (
                            <div key={index} className="mt-2 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                                <SelectField
                                    aria-label="Filter field"
                                    options={filterFieldOptions}
                                    value={filter.field}
                                    onChange={(option) => option && setFilter(index, { field: option.value, op: "", value: "" })}
                                />
                                <SelectField
                                    aria-label="Filter operator"
                                    options={opsFor(filter.field)}
                                    value={filter.op}
                                    onChange={(option) => option && setFilter(index, { op: option.value })}
                                />
                                <FilterValueInput filter={filter} index={index} />
                                <Button
                                    size="sm"
                                    color="tertiary"
                                    iconLeading={Trash01}
                                    aria-label="Remove filter"
                                    onClick={() => setField("filters", form.filters.filter((_, i) => i !== index))}
                                />
                            </div>
                        ))}
                    </Block>
                </Card>

                {/* ---- Preview + save ---- */}
                <div className="xl:sticky xl:top-4 xl:col-span-5">
                    <Card className="mt-0">
                        <div className="border-b border-secondary px-5 py-4">
                            <h2 className="text-md font-semibold text-primary">Live preview</h2>
                            <p className="mt-1 text-xs text-tertiary">Real data, updating as you build. This is exactly what a dashboard shows.</p>
                        </div>

                        <div className="p-5">
                            {!isRunnable ? (
                                <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-secondary px-4 text-center">
                                    <BarChart03 className="size-6 text-fg-quaternary" />
                                    <p className="text-sm font-medium text-secondary">One more thing needed</p>
                                    <p className="max-w-64 text-xs text-tertiary">{missing}</p>
                                </div>
                            ) : (
                                <div className="min-h-56">
                                    <WidgetCard
                                        title={form.title || "Untitled section"}
                                        size="full"
                                        result={preview.running ? null : preview.result}
                                        error={preview.error}
                                        seriesColors={form.seriesColors}
                                    />
                                </div>
                            )}

                            {isRunnable && sentence && (
                                <p className="mt-3 flex items-start gap-1.5 text-xs text-tertiary">
                                    <CheckCircle className="mt-px size-3.5 shrink-0 text-fg-quaternary" />
                                    <span>Showing {sentence}.</span>
                                </p>
                            )}
                        </div>

                        {allowed && (
                            <div className="border-t border-secondary p-5">
                                <Field
                                    label="Name this section"
                                    hint="Shown as the chart's title on dashboards."
                                    name="title"
                                    placeholder="e.g. Users by department"
                                    value={form.title}
                                    onChange={(event) => setField("title", event.target.value)}
                                />
                                <div className="mt-4">
                                    <TextAreaField
                                        label="What this shows"
                                        hint="Optional. Shown behind the ? on the widget — say what is measured and over what period, so a reader is not left guessing."
                                        name="description"
                                        rows={3}
                                        maxLength={280}
                                        placeholder="e.g. Mean failed sign-in attempts per user over the last 30 days."
                                        value={form.description}
                                        onChange={(event) => setField("description", event.target.value)}
                                    />
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button color="secondary" className="flex-1" onClick={() => navigate("/dashboard-builder")}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        iconLeading={Save01}
                                        onClick={save}
                                        isLoading={saving}
                                        isDisabled={saving || !isRunnable || !form.title.trim()}
                                    >
                                        {isEdit ? "Save changes" : "Save section"}
                                    </Button>
                                </div>
                                {!form.title.trim() && isRunnable && (
                                    <p className="mt-2 text-center text-xs text-tertiary">Give it a name to save it.</p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
};

export default DashboardSectionEditor;

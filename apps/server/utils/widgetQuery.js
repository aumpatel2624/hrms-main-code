import mongoose from "mongoose";
import {
    METRIC_TYPES,
    CHART_TYPES,
    DATE_RANGES,
    GROUPED_CHART_TYPES,
    TIME_SERIES_CHART_TYPES,
    COLORABLE_CHART_TYPES,
    SERIES_SLOTS,
} from "@demo-panel/shared/widgets";
import { OPERATORS, buildFilterMatch } from "./listQuery.js";

/**
 * The widget grammar engine (ADR-003). A widget is only ever a reference into
 * its source's registry entry (config/widgetSources.js); this module turns a
 * validated widget into an aggregation pipeline. Nothing here reads a field
 * name from the widget without checking it against the registry first.
 *
 * Split like listQuery: pure builders (unit-tested, no database) plus a thin
 * runner.
 */

/** Days behind `now` each preset covers. */
const RANGE_DAYS = { last7: 7, last30: 30, last90: 90, last365: 365 };

/** Widest result a widget may return: grouped buckets / daily line points. */
export const MAX_BUCKETS = 50;
export const MAX_LINE_POINTS = 400;

/**
 * Validate a widget definition against its source's registry entry.
 * Returns an array of human-readable problems; empty means valid.
 * Save-time and run-time both call this — the registry may have changed
 * between the two.
 */
export const validateWidget = (widget, source) => {
    const errors = [];
    if (!source) return ["Unknown widget source"];

    const metricType = widget.metric?.type ?? "count";
    if (!METRIC_TYPES.includes(metricType)) errors.push(`Unknown metric type "${metricType}"`);

    if (metricType === "count") {
        // field is meaningless for count — normalised away by the controller
    } else if (!widget.metric?.field || !source.aggregatable[widget.metric.field]) {
        errors.push(`Metric "${metricType}" needs a numeric field from: ${Object.keys(source.aggregatable).join(", ") || "(none for this source)"}`);
    }

    if (widget.groupBy && !source.groupable[widget.groupBy]) {
        errors.push(`"${widget.groupBy}" is not groupable on this source`);
    }

    if (widget.dateField && !source.dateFields[widget.dateField]) {
        errors.push(`"${widget.dateField}" is not a date field on this source`);
    }
    if (widget.dateRange && !DATE_RANGES.includes(widget.dateRange)) {
        errors.push(`Unknown date range "${widget.dateRange}"`);
    }
    if (widget.dateRange && widget.dateRange !== "all" && !widget.dateField) {
        errors.push("A date range needs a date field");
    }

    if (!CHART_TYPES.includes(widget.chartType)) {
        errors.push(`Unknown chart type "${widget.chartType}"`);
    }
    // Time-series charts plot along a date axis; grouped charts plot one
    // bucket per category. The two are mutually exclusive by construction.
    if (TIME_SERIES_CHART_TYPES.includes(widget.chartType) && !widget.dateField) {
        errors.push(`A ${widget.chartType} chart needs a date field`);
    }
    if (TIME_SERIES_CHART_TYPES.includes(widget.chartType) && widget.groupBy) {
        errors.push(`A ${widget.chartType} chart plots over time — remove the group-by`);
    }
    if (widget.chartType === "stat" && widget.groupBy) {
        errors.push("A stat tile shows one number — remove the group-by");
    }
    if (GROUPED_CHART_TYPES.includes(widget.chartType) && !widget.groupBy) {
        errors.push(`A ${widget.chartType} chart needs a group-by`);
    }

    // Colours are a display concern, but still validated: a stored slot the
    // palette does not have would render as no colour at all.
    if (widget.seriesColors) {
        const entries =
            widget.seriesColors instanceof Map ? [...widget.seriesColors.entries()] : Object.entries(widget.seriesColors);
        if (entries.length && !COLORABLE_CHART_TYPES.includes(widget.chartType)) {
            errors.push(`A ${widget.chartType} chart has no categories to colour`);
        }
        for (const [label, slot] of entries) {
            if (!SERIES_SLOTS.includes(Number(slot))) {
                errors.push(`"${label}" has an unknown colour slot "${slot}"`);
            }
        }
    }

    for (const filter of widget.filters ?? []) {
        const type = source.filterable[filter?.field];
        if (!type) {
            errors.push(`"${filter?.field}" is not filterable on this source`);
        } else if (!OPERATORS[type]?.includes(filter.op)) {
            errors.push(`Operator "${filter.op}" does not fit ${filter.field} (${type})`);
        }
    }

    return errors;
};

/**
 * Build the aggregation pipeline for a validated widget.
 *
 * @param widget      the widget definition (validated with validateWidget)
 * @param source      its registry entry
 * @param scopeFilter from buildScopeFilter() — server-set, never client input
 * @param now         injected for testability
 */
export const buildWidgetPipeline = (widget, source, scopeFilter = null, now = new Date()) => {
    const pipeline = [];

    // Scope first, so it rides the indexes and nothing can widen it later.
    if (scopeFilter) pipeline.push({ $match: scopeFilter });

    const filterMatch = buildFilterMatch(widget.filters ?? [], source.filterable);
    if (filterMatch) pipeline.push({ $match: filterMatch });

    const days = RANGE_DAYS[widget.dateRange];
    if (widget.dateField && days) {
        const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        pipeline.push({ $match: { [widget.dateField]: { $gte: from } } });
    }

    const value =
        (widget.metric?.type ?? "count") === "count"
            ? { $sum: 1 }
            : { [`$${widget.metric.type}`]: `$${widget.metric.field}` };

    if (TIME_SERIES_CHART_TYPES.includes(widget.chartType)) {
        // One point per day along the widget's date field.
        pipeline.push(
            { $match: { [widget.dateField]: { $ne: null } } },
            { $group: { _id: { $dateTrunc: { date: `$${widget.dateField}`, unit: "day" } }, value } },
            { $sort: { _id: 1 } },
            { $limit: MAX_LINE_POINTS },
            { $project: { _id: 0, label: "$_id", value: 1 } },
        );
        return pipeline;
    }

    if (widget.groupBy) {
        pipeline.push({ $group: { _id: `$${widget.groupBy}`, value } });

        const lookup = source.groupable[widget.groupBy]?.lookup;
        if (lookup) {
            pipeline.push(
                { $lookup: { from: lookup.from, localField: "_id", foreignField: "_id", as: "labelDoc" } },
                { $addFields: { label: { $ifNull: [{ $first: `$labelDoc.${lookup.labelField}` }, "$_id"] } } },
            );
        } else {
            pipeline.push({ $addFields: { label: "$_id" } });
        }

        pipeline.push(
            { $sort: { value: -1 } },
            { $limit: MAX_BUCKETS },
            { $project: { _id: 0, label: 1, value: 1 } },
        );
        return pipeline;
    }

    // stat / ungrouped table: one row.
    pipeline.push(
        { $group: { _id: null, value } },
        { $project: { _id: 0, label: { $literal: null }, value: 1 } },
    );
    return pipeline;
};

/**
 * Execute a widget against its source model.
 * @returns [{ label, value }]
 */
export const runWidgetQuery = async (widget, source, scopeFilter, now = new Date()) => {
    const model = mongoose.model(source.model);
    return model.aggregate(buildWidgetPipeline(widget, source, scopeFilter, now));
};

/** Rows a stat tile's breakdown shows before the rest fold into "Other". */
export const BREAKDOWN_LIMIT = 5;

/**
 * Which field a stat tile breaks down by, or null when the source has none.
 *
 * The registry's `groupable` map is ordered as it is written, and the first
 * entry is the one a human chose to put first — the most meaningful way to
 * cut that collection. Taking it keeps the breakdown a display concern with
 * nothing new to store, at the cost of not being per-widget selectable. If a
 * source ever wants a different default, reorder its `groupable` map.
 */
export const breakdownFieldFor = (source) => Object.keys(source?.groupable ?? {})[0] ?? null;

/**
 * The breakdown behind a widget's picture, for the info affordance.
 *
 * Three cases, and only one of them costs a query:
 *
 * - **Already grouped** (bar, pie, donut, radar, radial): the widget's own
 *   rows *are* the breakdown. Re-querying would return the identical result,
 *   so the caller passes `rows` in and no aggregation runs.
 * - **A stat tile**: one number with nothing to see. Re-run the same widget
 *   with a `groupBy` injected, so the tooltip explains what makes up the
 *   total.
 * - **Time series** (line, area): plotted over dates, not categories.
 *   Grouping by a category answers the question the chart cannot — "which
 *   categories is this made of" — so it is worth the extra query.
 *
 * The injected group-by reuses buildWidgetPipeline's grouped branch: the
 * registry `lookup` for readable labels, the sort and the MAX_BUCKETS cap all
 * come for free rather than being reimplemented here.
 *
 * Returns null when the source has no groupable field, so the caller can say
 * so rather than render an empty table.
 *
 * @returns { field, label, rows, other, total, additive } | null
 */
export const runWidgetBreakdown = async (widget, source, scopeFilter, rows = null, now = new Date()) => {
    const metricType = widget.metric?.type ?? "count";

    // The widget already groups by something — its rows are the breakdown.
    if (widget.groupBy && rows) {
        return foldBreakdown(rows, {
            field: widget.groupBy,
            label: source.groupable[widget.groupBy]?.label ?? widget.groupBy,
            metricType,
        });
    }

    const field = breakdownFieldFor(source);
    if (!field) return null;

    const model = mongoose.model(source.model);
    const grouped = await model.aggregate(
        buildWidgetPipeline({ ...widget, groupBy: field, chartType: "bar" }, source, scopeFilter, now),
    );

    return foldBreakdown(grouped, {
        field,
        label: source.groupable[field]?.label ?? field,
        metricType,
    });
};

/**
 * Fold grouped rows into the shape the tooltip renders. Pure — the database
 * work is done by the time this runs, so the arithmetic is unit-testable.
 *
 * count and sum are additive: buckets add up to the tile's number, so a total
 * and a share per row are meaningful. avg is not — the mean of the per-group
 * means is not the overall mean unless every group holds the same number of
 * rows. Report per-group averages with no total rather than a figure that
 * looks authoritative and is wrong.
 */
export const foldBreakdown = (rows, { field, label, metricType = "count" }) => {
    const additive = metricType !== "avg";
    const top = rows.slice(0, BREAKDOWN_LIMIT);

    if (!additive) {
        return { field, label, rows: top, other: null, total: null, additive };
    }

    // Sum every bucket, not just the ones shown: "Other" and the total have
    // to account for the tail, or the percentages read as though the top five
    // were everything.
    const total = rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
    const other = rows.slice(BREAKDOWN_LIMIT).reduce((sum, row) => sum + Number(row.value ?? 0), 0);

    return { field, label, rows: top, other, total, additive };
};

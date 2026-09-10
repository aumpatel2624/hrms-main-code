import assert from "node:assert/strict";
import {
    validateWidget,
    buildWidgetPipeline,
    breakdownFieldFor,
    foldBreakdown,
    BREAKDOWN_LIMIT,
    MAX_BUCKETS,
    MAX_LINE_POINTS,
} from "./widgetQuery.js";

const SOURCE = {
    label: "Users",
    model: "User",
    aggregatable: { salary: "Salary" },
    groupable: {
        departmentId: { label: "Department", lookup: { from: "departments", labelField: "departmentName" } },
        isActive: { label: "Active" },
    },
    dateFields: { createdAt: "Created" },
    filterable: { email: "string", isActive: "boolean", createdAt: "date" },
    scopeable: { department: "departmentId", owner: "_id" },
};

const NOW = new Date("2026-08-17T00:00:00.000Z");

// ---- validateWidget -------------------------------------------------------

assert.deepEqual(validateWidget({ chartType: "stat", metric: { type: "count" } }, SOURCE), []);
assert.deepEqual(validateWidget({ chartType: "stat" }, undefined), ["Unknown widget source"]);

// sum needs a registered numeric field
assert.equal(validateWidget({ chartType: "stat", metric: { type: "sum" } }, SOURCE).length, 1);
assert.deepEqual(validateWidget({ chartType: "stat", metric: { type: "sum", field: "salary" } }, SOURCE), []);
assert.equal(validateWidget({ chartType: "stat", metric: { type: "sum", field: "password" } }, SOURCE).length, 1);

// grammar shape rules
assert.equal(validateWidget({ chartType: "bar", metric: { type: "count" } }, SOURCE).length, 1); // bar needs group-by
assert.deepEqual(validateWidget({ chartType: "bar", groupBy: "departmentId", metric: { type: "count" } }, SOURCE), []);
assert.equal(validateWidget({ chartType: "stat", groupBy: "departmentId", metric: { type: "count" } }, SOURCE).length, 1);
assert.equal(validateWidget({ chartType: "line", metric: { type: "count" } }, SOURCE).length, 1); // line needs date
assert.deepEqual(validateWidget({ chartType: "line", dateField: "createdAt", metric: { type: "count" } }, SOURCE), []);
assert.equal(validateWidget({ chartType: "bar", groupBy: "password", metric: { type: "count" } }, SOURCE).length, 1);
assert.equal(validateWidget({ chartType: "stat", dateRange: "last30", metric: { type: "count" } }, SOURCE).length, 1); // range without field
assert.equal(
    validateWidget({ chartType: "stat", metric: { type: "count" }, filters: [{ field: "password", op: "eq", value: "x" }] }, SOURCE).length,
    1,
);
assert.equal(
    validateWidget({ chartType: "stat", metric: { type: "count" }, filters: [{ field: "isActive", op: "contains", value: "x" }] }, SOURCE).length,
    1, // operator does not fit boolean
);

// ---- buildWidgetPipeline --------------------------------------------------

// Scope rides the FIRST stage; grouped bar gets lookup + label + limit.
{
    const widget = { chartType: "bar", groupBy: "departmentId", metric: { type: "count" } };
    const scope = { departmentId: "DEPT" };
    const pipeline = buildWidgetPipeline(widget, SOURCE, scope, NOW);
    assert.deepEqual(pipeline[0], { $match: scope });
    assert.deepEqual(pipeline[1], { $group: { _id: "$departmentId", value: { $sum: 1 } } });
    assert.equal(pipeline[2].$lookup.from, "departments");
    assert.ok(pipeline.some((stage) => stage.$limit === MAX_BUCKETS));
    assert.deepEqual(pipeline.at(-1), { $project: { _id: 0, label: 1, value: 1 } });
}

// Date preset becomes a $gte computed from `now`.
{
    const widget = { chartType: "stat", dateField: "createdAt", dateRange: "last30", metric: { type: "count" } };
    const pipeline = buildWidgetPipeline(widget, SOURCE, null, NOW);
    const dateMatch = pipeline.find((stage) => stage.$match?.createdAt);
    assert.deepEqual(dateMatch.$match.createdAt, { $gte: new Date("2026-07-18T00:00:00.000Z") });
}

// Line: day-truncated buckets, ascending, capped.
{
    const widget = { chartType: "line", dateField: "createdAt", metric: { type: "count" } };
    const pipeline = buildWidgetPipeline(widget, SOURCE, null, NOW);
    const group = pipeline.find((stage) => stage.$group);
    assert.deepEqual(group.$group._id, { $dateTrunc: { date: "$createdAt", unit: "day" } });
    assert.ok(pipeline.some((stage) => stage.$limit === MAX_LINE_POINTS));
    assert.deepEqual(pipeline.find((stage) => stage.$sort), { $sort: { _id: 1 } });
}

// sum/avg metrics reference the declared field.
{
    const widget = { chartType: "stat", metric: { type: "avg", field: "salary" } };
    const pipeline = buildWidgetPipeline(widget, SOURCE, null, NOW);
    assert.deepEqual(pipeline.find((stage) => stage.$group).$group.value, { $avg: "$salary" });
}

// Widget filters go through the allowlist grammar; unknown fields drop.
{
    const widget = {
        chartType: "stat",
        metric: { type: "count" },
        filters: [
            { field: "isActive", op: "eq", value: true },
            { field: "password", op: "eq", value: "x" }, // not filterable — dropped
        ],
    };
    const pipeline = buildWidgetPipeline(widget, SOURCE, null, NOW);
    const filterStage = pipeline.find((stage) => stage.$match?.$and);
    assert.deepEqual(filterStage.$match.$and, [{ isActive: { $eq: true } }]);
    assert.ok(!JSON.stringify(pipeline).includes("password"));
}

// No scope, no filters, stat: single null-labelled total.
{
    const pipeline = buildWidgetPipeline({ chartType: "stat", metric: { type: "count" } }, SOURCE, null, NOW);
    assert.deepEqual(pipeline[0], { $group: { _id: null, value: { $sum: 1 } } });
}

// ---- new chart types (ADR-006) --------------------------------------------

// Every grouped chart type needs a group-by, and accepts one.
for (const chartType of ["bar", "barHorizontal", "pie", "donut", "radar", "radial"]) {
    assert.equal(
        validateWidget({ chartType, metric: { type: "count" } }, SOURCE).length,
        1,
        `${chartType} should require a group-by`,
    );
    assert.deepEqual(
        validateWidget({ chartType, metric: { type: "count" }, groupBy: "isActive" }, SOURCE),
        [],
        `${chartType} should accept a group-by`,
    );
}

// Both time-series types need a date field and reject a group-by.
for (const chartType of ["line", "area"]) {
    assert.equal(validateWidget({ chartType, metric: { type: "count" } }, SOURCE).length, 1);
    assert.deepEqual(validateWidget({ chartType, metric: { type: "count" }, dateField: "createdAt" }, SOURCE), []);
    assert.equal(
        validateWidget({ chartType, metric: { type: "count" }, dateField: "createdAt", groupBy: "isActive" }, SOURCE).length,
        1,
    );
}

// Area plots along the date axis exactly as line does.
{
    const widget = { chartType: "area", metric: { type: "count" }, dateField: "createdAt", dateRange: "all" };
    const pipeline = buildWidgetPipeline(widget, SOURCE, null, NOW);
    const group = pipeline.find((stage) => stage.$group);
    assert.deepEqual(group.$group._id, { $dateTrunc: { date: "$createdAt", unit: "day" } });
}

// ---- seriesColors ---------------------------------------------------------

// Valid slots on a colourable chart pass; a plain object and a Map both work.
assert.deepEqual(
    validateWidget({ chartType: "pie", metric: { type: "count" }, groupBy: "isActive", seriesColors: { Yes: 3, No: 5 } }, SOURCE),
    [],
);
assert.deepEqual(
    validateWidget(
        { chartType: "pie", metric: { type: "count" }, groupBy: "isActive", seriesColors: new Map([["Yes", 3]]) },
        SOURCE,
    ),
    [],
);

// A slot outside the palette is rejected.
assert.equal(
    validateWidget({ chartType: "pie", metric: { type: "count" }, groupBy: "isActive", seriesColors: { Yes: 99 } }, SOURCE).length,
    1,
);

// Colours on a chart type with no categories are rejected.
assert.equal(
    validateWidget({ chartType: "stat", metric: { type: "count" }, seriesColors: { Yes: 1 } }, SOURCE).length,
    1,
);

// An empty map is not an error — it is how "reset to automatic" arrives.
assert.deepEqual(validateWidget({ chartType: "stat", metric: { type: "count" }, seriesColors: {} }, SOURCE), []);

// ---- stat breakdown ----------------------------------------------------

// The first groupable field is the default cut; a source with none opts out.
assert.equal(breakdownFieldFor(SOURCE), "departmentId");
assert.equal(breakdownFieldFor({ groupable: {} }), null);
assert.equal(breakdownFieldFor(undefined), null);

const bdRows = [
    { label: "Sales", value: 18 },
    { label: "Support", value: 12 },
    { label: "Engineering", value: 9 },
    { label: "Finance", value: 4 },
    { label: "Ops", value: 2 },
    { label: "Legal", value: 1 },
];

const counted = foldBreakdown(bdRows, { field: "departmentId", label: "Department" });
assert.equal(counted.rows.length, BREAKDOWN_LIMIT);
// The tail folds into "other" — it is not silently dropped.
assert.equal(counted.other, 1);
// Total covers every bucket, so shares are computed against the real whole.
assert.equal(counted.total, 46);
assert.equal(counted.total, counted.rows.reduce((s, r) => s + r.value, 0) + counted.other);
assert.equal(counted.additive, true);

// Fewer rows than the limit: nothing folded, total still right.
const short = foldBreakdown(bdRows.slice(0, 2), { field: "departmentId", label: "Department" });
assert.equal(short.rows.length, 2);
assert.equal(short.other, 0);
assert.equal(short.total, 30);

// avg is not additive — averaging per-group averages would be wrong, so the
// fold reports no total rather than a plausible-looking one.
const averaged = foldBreakdown(bdRows, { field: "departmentId", label: "Department", metricType: "avg" });
assert.equal(averaged.additive, false);
assert.equal(averaged.total, null);
assert.equal(averaged.other, null);
assert.equal(averaged.rows.length, BREAKDOWN_LIMIT);

// sum stays additive.
assert.equal(foldBreakdown(bdRows, { field: "x", label: "X", metricType: "sum" }).total, 46);

// Empty source data folds to zeroes, not NaN.
const none = foldBreakdown([], { field: "departmentId", label: "Department" });
assert.equal(none.total, 0);
assert.equal(none.other, 0);
assert.deepEqual(none.rows, []);

// A breakdown reuses the grouped pipeline: same lookup, same cap.
const bdPipeline = buildWidgetPipeline(
    { chartType: "bar", groupBy: "departmentId", metric: { type: "count" } },
    SOURCE,
);
// No scope filter here, so $group leads the pipeline.
assert.equal(bdPipeline[0].$group._id, "$departmentId");
assert.equal(bdPipeline[1].$lookup.from, "departments");
assert.ok(bdPipeline.some((stage) => stage.$limit === MAX_BUCKETS));

// A grouped chart's own rows are its breakdown — folding them needs no query,
// and the labels come through unchanged.
const grouped = foldBreakdown(bdRows, { field: "departmentId", label: "Department" });
assert.equal(grouped.rows[0].label, "Sales");
assert.equal(grouped.total, 46);

console.log("widgetQuery: all checks passed");

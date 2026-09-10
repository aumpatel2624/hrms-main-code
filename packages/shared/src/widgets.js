/**
 * Dashboard widget grammar constants (ADR-003). The server validates stored
 * widgets against these and the admin builder offers them in dropdowns, so
 * the strings must match character-for-character.
 */
export const METRIC_TYPES = Object.freeze(["count", "sum", "avg"]);

export const CHART_TYPES = Object.freeze([
    "stat",
    "bar",
    "barHorizontal",
    "line",
    "area",
    "pie",
    "donut",
    "radar",
    "radial",
    "table",
]);

/** Chart types that plot one bucket per category — these need a group-by. */
export const GROUPED_CHART_TYPES = Object.freeze(["bar", "barHorizontal", "pie", "donut", "radar", "radial"]);

/** Chart types that plot along a date axis — these need a date field. */
export const TIME_SERIES_CHART_TYPES = Object.freeze(["line", "area"]);

/** Preset ranges only — a widget stores a rolling window, never fixed dates. */
export const DATE_RANGES = Object.freeze(["last7", "last30", "last90", "last365", "all"]);

/** Grid footprint of a pinned widget on a dashboard. */
export const WIDGET_SIZES = Object.freeze(["sm", "md", "lg", "full"]);

/**
 * Palette slots a chart category may be assigned. Stored as a slot number,
 * never a hex value: the admin resolves it to --viz-series-N, which is themed
 * per light/dark mode. Storing hex would break dark mode and freeze a widget
 * to whatever the palette was on the day it was saved.
 */
export const SERIES_SLOTS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);

/** Chart types whose categories can carry their own colour. */
export const COLORABLE_CHART_TYPES = Object.freeze(["bar", "barHorizontal", "pie", "donut", "radar", "radial"]);

import mongoose from "mongoose";
import { METRIC_TYPES, CHART_TYPES, DATE_RANGES } from "@demo-panel/shared/widgets";

/**
 * One saved dashboard section (ADR-003). Everything here is a *reference into
 * the code-registered source registry* (config/widgetSources.js) — field
 * names are validated against the registry on save and re-checked at run, so
 * a stored widget can never query outside its source's allowlists.
 */
const DashboardWidgetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    /**
     * What the number means, in the words of whoever built the widget —
     * shown behind the "?" on a stat tile. Deliberately author-written and
     * not derived: "Average failed attempts" could be per user, per day or
     * per session, and only the author knows which. A generated sentence
     * would restate the config while reading like an explanation.
     * Empty means the tile shows no "?" at all.
     */
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 280,
    },
    /** Key into the widget source registry. */
    source: {
      type: String,
      required: true,
      trim: true,
    },
    metric: {
      type: {
        type: String,
        enum: METRIC_TYPES,
        default: "count",
        required: true,
      },
      /** Registry `aggregatable` field — required for sum/avg, null for count. */
      field: {
        type: String,
        trim: true,
        default: null,
      },
    },
    /** Registry `groupable` field, or null for a single total. */
    groupBy: {
      type: String,
      trim: true,
      default: null,
    },
    /** Registry date field the range applies to; null means no date filter. */
    dateField: {
      type: String,
      trim: true,
      default: null,
    },
    dateRange: {
      type: String,
      enum: DATE_RANGES,
      default: "all",
    },
    /** Same { field, op, value } grammar as list filters, validated against
     *  the registry's filterable map + OPERATORS. Bounded: a widget holds a
     *  handful of filters, never queried on their own. */
    filters: {
      type: [
        {
          field: { type: String, required: true, trim: true },
          op: { type: String, required: true, trim: true },
          value: { type: mongoose.Schema.Types.Mixed, default: null },
        },
      ],
      default: [],
    },
    chartType: {
      type: String,
      enum: CHART_TYPES,
      default: "stat",
      required: true,
    },
    /**
     * Optional colour per group-by category, `{ "Sales": 3 }` — the value is a
     * palette *slot* (1-8), resolved to --viz-series-N by the admin so the
     * chart stays themed in dark mode. Keyed by the rendered category label
     * rather than by position, so a category keeps its colour when the sort
     * order changes. Categories with no entry fall back to their positional
     * slot, which is what every existing widget does.
     *
     * A Map, not a subdocument: the keys are user data (department names),
     * and Mongoose would otherwise reject any key containing a dot.
     */
    seriesColors: {
      type: Map,
      of: Number,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

// Title is the natural key the library upserts and searches by.
DashboardWidgetSchema.index({ title: 1 }, { unique: true });
// source, chartType and createdAt appear in the library's filterable map.
DashboardWidgetSchema.index({ source: 1 });
DashboardWidgetSchema.index({ chartType: 1 });
DashboardWidgetSchema.index({ createdAt: -1 });

export default mongoose.model("DashboardWidget", DashboardWidgetSchema);

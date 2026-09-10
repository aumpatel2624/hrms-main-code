import { ROLES } from "@demo-panel/shared/roles";
import DashboardWidget from "../../models/DashboardWidget.js";
import RoleDashboard from "../../models/RoleDashboard.js";
import { WIDGET_SOURCES } from "../../config/widgetSources.js";
import { runListQuery, OPERATORS } from "../../utils/listQuery.js";
import { buildScopeFilter } from "../../utils/scope.js";
import { validateWidget, runWidgetQuery, runWidgetBreakdown } from "../../utils/widgetQuery.js";
import { resolveUserScope } from "../../middlewares/checkPermission.js";
import { getReferencingCounts, formatReferenceMessage } from "../../utils/referenceHelper.js";

/**
 * `{ label: slot }` with numeric slots, or undefined when there is nothing to
 * store. Keys are user data (category labels) and are stored verbatim in a Map
 * — the slot values are what validateWidget checks against SERIES_SLOTS.
 */
const normaliseSeriesColors = (input) => {
  if (!input || typeof input !== "object") return undefined;
  const entries = Object.entries(input)
    .filter(([, slot]) => slot !== null && slot !== undefined && slot !== "")
    .map(([label, slot]) => [label, Number(slot)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

/** Normalise an incoming widget body to the stored shape. */
const pickWidget = (body) => ({
  title: body.title,
  description: (body.description ?? "").trim(),
  source: body.source,
  metric: {
    type: body.metric?.type ?? "count",
    // field is meaningless for count — never store one.
    field: (body.metric?.type ?? "count") === "count" ? null : (body.metric?.field ?? null),
  },
  groupBy: body.groupBy || null,
  dateField: body.dateField || null,
  dateRange: body.dateRange || "all",
  filters: (body.filters ?? []).map((filter) => ({
    field: filter.field,
    op: filter.op,
    value: filter.value ?? null,
  })),
  chartType: body.chartType,
  // Category colours: `{ label: slot }`. Coerced to numbers here so a slot
  // arriving as "3" from a form select still validates against SERIES_SLOTS.
  // Empty means "no overrides" — stored as undefined, not {}, so a widget the
  // user reset goes back to the positional palette.
  seriesColors: normaliseSeriesColors(body.seriesColors),
  ...(body.isActive !== undefined && { isActive: body.isActive }),
});

/** 400 unless the definition passes registry validation. Returns the source. */
const requireValidWidget = (widget, res) => {
  const source = WIDGET_SOURCES[widget.source];
  const errors = validateWidget(widget, source);
  if (errors.length) {
    res.status(400).json({
      isOk: false,
      status: 400,
      message: "Invalid widget definition",
      details: errors,
    });
    return null;
  }
  return source;
};

// ============ WIDGET SOURCES ============

export const listWidgetSources = async (req, res) => {
  // Registry description for the builder UI. `model` stays server-side.
  const sources = Object.entries(WIDGET_SOURCES).map(([key, source]) => ({
    key,
    label: source.label,
    aggregatable: source.aggregatable,
    groupable: Object.fromEntries(
      Object.entries(source.groupable).map(([field, def]) => [field, { label: def.label }]),
    ),
    dateFields: source.dateFields,
    filterable: source.filterable,
  }));
  return res.status(200).json({ isOk: true, status: 200, data: { sources, operators: OPERATORS } });
};

// ============ WIDGET CRUD ============

export const createDashboardWidget = async (req, res) => {
  try {
    const widget = pickWidget(req.body);
    if (!requireValidWidget(widget, res)) return;

    if (await DashboardWidget.findOne({ title: widget.title })) {
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "A widget with this title already exists" });
    }

    const created = await DashboardWidget.create(widget);
    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Widget created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Error in createDashboardWidget:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listDashboardWidgets = async (req, res) => {
  try {
    const widgets = await DashboardWidget.find({ isActive: true }).sort({ title: 1 });
    return res.status(200).json({ isOk: true, status: 200, data: widgets });
  } catch (error) {
    console.error("Error in listDashboardWidgets:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getDashboardWidgetById = async (req, res) => {
  try {
    const widget = await DashboardWidget.findById(req.params.widgetId);
    if (!widget) {
      return res.status(404).json({ isOk: false, status: 404, message: "Widget not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: widget });
  } catch (error) {
    console.error("Error in getDashboardWidgetById:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateDashboardWidget = async (req, res) => {
  try {
    const widget = pickWidget(req.body);
    if (!requireValidWidget(widget, res)) return;

    if (await DashboardWidget.findOne({ title: widget.title, _id: { $ne: req.params.widgetId } })) {
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "A widget with this title already exists" });
    }

    // Mongoose drops undefined keys from an update, so "reset colours to auto"
    // would otherwise leave the old map in place. Unset it explicitly.
    const { seriesColors, ...rest } = widget;
    const update = seriesColors ? { $set: widget } : { $set: rest, $unset: { seriesColors: "" } };

    const updated = await DashboardWidget.findByIdAndUpdate(req.params.widgetId, update, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ isOk: false, status: 404, message: "Widget not found" });
    }
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Widget updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateDashboardWidget:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteDashboardWidget = async (req, res) => {
  try {
    const { widgetId } = req.params;

    const referenceInfo = await getReferencingCounts("DashboardWidget", widgetId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Cannot delete widget. It is pinned to a dashboard.",
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }

    const widget = await DashboardWidget.findByIdAndUpdate(widgetId, { isDeleted: true });
    if (!widget) {
      return res.status(404).json({ isOk: false, status: 404, message: "Widget not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, message: "Widget deleted successfully" });
  } catch (error) {
    console.error("Error in deleteDashboardWidget:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listDashboardWidgetByParams = async (req, res) => {
  try {
    const list = await runListQuery(DashboardWidget, req.body, {
      searchFields: ["title", "source"],
      filterable: {
        title: "string",
        source: "string",
        chartType: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.error("Error in listDashboardWidgetByParams:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ============ RUNNING ============

const executeWidget = async (req, res, widget) => {
  const source = WIDGET_SOURCES[widget.source];
  const errors = validateWidget(widget, source);
  if (errors.length) {
    // A stored widget can go stale if the registry changed underneath it.
    return res.status(409).json({
      isOk: false,
      status: 409,
      message: "This widget no longer matches its data source",
      details: errors,
    });
  }

  if (!(await resolveUserScope(req))) {
    return res.status(401).json({ isOk: false, status: 401, message: "Session invalid or expired" });
  }
  const scopeFilter = buildScopeFilter(req.user, source.scopeable);

  const rows = await runWidgetQuery(widget, source, scopeFilter);

  // Every widget gets a breakdown. A chart that already groups reuses the rows
  // it just fetched — no second query — while a stat tile or a time series
  // needs one. Runs on the same scopeFilter either way, so the breakdown can
  // never reveal rows the widget itself would have hidden.
  const breakdown = await runWidgetBreakdown(widget, source, scopeFilter, rows);

  return res.status(200).json({
    isOk: true,
    status: 200,
    // seriesColors rides along so a dashboard renders a widget's colours
    // without a second fetch. A Map from Mongoose, a plain object from the
    // preview path — normalise so the client only ever sees one shape.
    data: {
      title: widget.title,
      description: widget.description || "",
      chartType: widget.chartType,
      rows,
      breakdown,
      seriesColors: widget.seriesColors
        ? Object.fromEntries(widget.seriesColors instanceof Map ? widget.seriesColors : Object.entries(widget.seriesColors))
        : null,
    },
  });
};

/** Run an unsaved definition from the builder (write-gated on the route). */
export const previewDashboardWidget = async (req, res) => {
  try {
    const widget = pickWidget({ ...req.body, title: req.body.title || "Preview" });
    if (!requireValidWidget(widget, res)) return;
    return await executeWidget(req, res, widget);
  } catch (error) {
    console.error("Error in previewDashboardWidget:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/** Run a saved widget. Allowed for ADMIN, or when the widget is pinned to the
 *  caller's role dashboard — a USER cannot probe unpinned widgets. */
export const runDashboardWidget = async (req, res) => {
  try {
    const widget = await DashboardWidget.findOne({ _id: req.params.widgetId, isActive: true }).lean();
    if (!widget) {
      return res.status(404).json({ isOk: false, status: 404, message: "Widget not found" });
    }

    if (req.user.role !== ROLES.ADMIN) {
      if (!(await resolveUserScope(req))) {
        return res.status(401).json({ isOk: false, status: 401, message: "Session invalid or expired" });
      }
      const pinned = await RoleDashboard.findOne({
        roleId: req.user.roleId,
        isActive: true,
        "widgets.widgetId": widget._id,
      }).lean();
      if (!pinned) {
        return res.status(403).json({
          isOk: false,
          status: 403,
          message: "You do not have permission to perform this action",
        });
      }
    }

    return await executeWidget(req, res, widget);
  } catch (error) {
    console.error("Error in runDashboardWidget:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ============ ROLE DASHBOARDS ============

const pickPins = (widgets) =>
  (widgets ?? []).map((pin, index) => ({
    widgetId: pin.widgetId,
    sequence: pin.sequence ?? index,
    size: pin.size || "md",
  }));

/** Upsert a role's dashboard. roleId null (or absent) = the admin/default one. */
export const saveRoleDashboard = async (req, res) => {
  try {
    const { roleId = null, widgets } = req.body;

    const pins = pickPins(widgets);
    const known = await DashboardWidget.countDocuments({
      _id: { $in: pins.map((pin) => pin.widgetId) },
    });
    if (known !== new Set(pins.map((pin) => String(pin.widgetId))).size) {
      return res
        .status(400)
        .json({ isOk: false, status: 400, message: "Unknown widget in dashboard" });
    }

    const dashboard = await RoleDashboard.findOneAndUpdate(
      { roleId },
      { roleId, widgets: pins },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Dashboard saved successfully",
      data: dashboard,
    });
  } catch (error) {
    console.error("Error in saveRoleDashboard:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

const loadDashboard = async (roleId) => {
  const dashboard = await RoleDashboard.findOne({ roleId, isActive: true })
    .populate("widgets.widgetId", "title chartType isActive")
    .lean();
  if (!dashboard) return null;

  // populate resolves soft-deleted widgets to null; drop those and inactive.
  dashboard.widgets = dashboard.widgets
    .filter((pin) => pin.widgetId && pin.widgetId.isActive)
    .sort((a, b) => a.sequence - b.sequence);
  return dashboard;
};

/** The caller's own dashboard: their role's, or the default one for ADMIN. */
export const getMyDashboard = async (req, res) => {
  try {
    let roleId = null;
    if (req.user.role !== ROLES.ADMIN) {
      if (!(await resolveUserScope(req))) {
        return res.status(401).json({ isOk: false, status: 401, message: "Session invalid or expired" });
      }
      roleId = req.user.roleId;
    }
    const dashboard = await loadDashboard(roleId);
    return res.status(200).json({ isOk: true, status: 200, data: dashboard });
  } catch (error) {
    console.error("Error in getMyDashboard:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/** Builder screen: read one role's dashboard. "default" = the null-role one. */
export const getRoleDashboard = async (req, res) => {
  try {
    const { roleId } = req.params;
    const dashboard = await loadDashboard(roleId === "default" ? null : roleId);
    return res.status(200).json({ isOk: true, status: 200, data: dashboard });
  } catch (error) {
    console.error("Error in getRoleDashboard:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

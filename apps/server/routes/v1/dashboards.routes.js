import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  allowOnlyFields,
  allowedSearchFields,
  searchValidation,
  allowedWidgetFields,
  widgetValidation,
  widgetPreviewValidation,
  allowedRoleDashboardFields,
  roleDashboardValidation,
} from "../../middlewares/inputValidator.js";
import {
  listWidgetSources,
  createDashboardWidget,
  listDashboardWidgets,
  getDashboardWidgetById,
  updateDashboardWidget,
  deleteDashboardWidget,
  listDashboardWidgetByParams,
  previewDashboardWidget,
  runDashboardWidget,
  saveRoleDashboard,
  getMyDashboard,
  getRoleDashboard,
} from "../../controllers/v1/dashboard.controller.js";

const router = express.Router();

// ============ WIDGET LIBRARY (Dashboard Builder screen) ============

/**
 * @swagger
 * /dashboard-widgets/sources:
 *   get:
 *     summary: Registry of widget sources (fields the builder may offer)
 *     tags: [Dashboards]
 *     responses:
 *       200:
 *         description: Sources plus the operator grammar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  "/dashboard-widgets/sources",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "read"),
  listWidgetSources,
);

/**
 * @swagger
 * /dashboard-widgets/search:
 *   post:
 *     summary: Search widgets with pagination
 *     tags: [Dashboards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchParams'
 *     responses:
 *       200:
 *         description: Paginated list of widgets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.post(
  "/dashboard-widgets/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "read"),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listDashboardWidgetByParams,
);

/**
 * @swagger
 * /dashboard-widgets/preview:
 *   post:
 *     summary: Run an unsaved widget definition (builder live preview)
 *     tags: [Dashboards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDashboardWidget'
 *     responses:
 *       200:
 *         description: Rows for the previewed widget
 *       400:
 *         description: Definition rejected by the source registry
 */
router.post(
  "/dashboard-widgets/preview",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "write"),
  allowOnlyFields(allowedWidgetFields),
  widgetPreviewValidation,
  previewDashboardWidget,
);

/**
 * @swagger
 * /dashboard-widgets:
 *   post:
 *     summary: Create a widget in the library
 *     tags: [Dashboards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDashboardWidget'
 *     responses:
 *       201:
 *         description: Widget created successfully
 *       400:
 *         description: Definition rejected by the source registry
 */
router.post(
  "/dashboard-widgets",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "write"),
  allowOnlyFields(allowedWidgetFields),
  widgetValidation,
  createDashboardWidget,
);

/**
 * @swagger
 * /dashboard-widgets:
 *   get:
 *     summary: List all active widgets (the library)
 *     tags: [Dashboards]
 *     responses:
 *       200:
 *         description: List of widgets
 */
router.get(
  "/dashboard-widgets",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "read"),
  listDashboardWidgets,
);

/**
 * @swagger
 * /dashboard-widgets/{widgetId}:
 *   get:
 *     summary: Get widget by ID
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget details
 *       404:
 *         description: Widget not found
 */
router.get(
  "/dashboard-widgets/:widgetId",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "read"),
  getDashboardWidgetById,
);

/**
 * @swagger
 * /dashboard-widgets/{widgetId}:
 *   put:
 *     summary: Update widget
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDashboardWidget'
 *     responses:
 *       200:
 *         description: Widget updated successfully
 *       404:
 *         description: Widget not found
 */
router.put(
  "/dashboard-widgets/:widgetId",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "edit"),
  allowOnlyFields(allowedWidgetFields),
  widgetValidation,
  updateDashboardWidget,
);

/**
 * @swagger
 * /dashboard-widgets/{widgetId}:
 *   delete:
 *     summary: Delete widget (blocked while pinned to any dashboard)
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget deleted successfully
 *       409:
 *         description: Widget is pinned to a dashboard
 */
router.delete(
  "/dashboard-widgets/:widgetId",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "delete"),
  deleteDashboardWidget,
);

// ============ RUNNING ============

/**
 * @swagger
 * /dashboard-widgets/{widgetId}/run:
 *   post:
 *     summary: Run a saved widget (ADMIN, or pinned to the caller's dashboard)
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rows for the widget, scoped to the caller's role
 *       403:
 *         description: Widget is not on the caller's dashboard
 */
router.post(
  "/dashboard-widgets/:widgetId/run",
  authMiddleware(ANY_ROLE),
  runDashboardWidget,
);

// ============ ROLE DASHBOARDS ============

/**
 * @swagger
 * /role-dashboards/me:
 *   get:
 *     summary: The caller's own dashboard (their role's, or the default for ADMIN)
 *     tags: [Dashboards]
 *     responses:
 *       200:
 *         description: Dashboard with ordered pinned widgets, or null
 */
router.get("/role-dashboards/me", authMiddleware(ANY_ROLE), getMyDashboard);

/**
 * @swagger
 * /role-dashboards/{roleId}:
 *   get:
 *     summary: One role's dashboard ("default" for the null-role one)
 *     tags: [Dashboards]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard with ordered pinned widgets, or null
 */
router.get(
  "/role-dashboards/:roleId",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "read"),
  getRoleDashboard,
);

/**
 * @swagger
 * /role-dashboards:
 *   post:
 *     summary: Upsert a role's dashboard (roleId null = the default one)
 *     tags: [Dashboards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: string
 *                 nullable: true
 *               widgets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     widgetId:
 *                       type: string
 *                     sequence:
 *                       type: number
 *                     size:
 *                       type: string
 *     responses:
 *       200:
 *         description: Dashboard saved successfully
 */
router.post(
  "/role-dashboards",
  authMiddleware(ANY_ROLE),
  checkPermission("/dashboard-builder", "edit"),
  allowOnlyFields(allowedRoleDashboardFields),
  roleDashboardValidation,
  saveRoleDashboard,
);

export default router;

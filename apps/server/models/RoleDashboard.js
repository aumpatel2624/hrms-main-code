import mongoose from "mongoose";
import { WIDGET_SIZES } from "@demo-panel/shared/widgets";

/**
 * Which widgets a role's dashboard shows, in what order and size (ADR-003).
 * One document per role, same shape philosophy as UserRoles. `roleId: null`
 * is the admin/default dashboard. The widgets array is bounded (a dashboard
 * pins a handful) and never read apart from its dashboard — embedded.
 */
const RoleDashboardSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleMaster",
      default: null,
    },
    widgets: {
      type: [
        {
          widgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DashboardWidget",
            required: true,
          },
          sequence: {
            type: Number,
            required: true,
          },
          size: {
            type: String,
            enum: WIDGET_SIZES,
            default: "md",
          },
        },
      ],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

// One dashboard per role (null included — a single admin/default dashboard).
RoleDashboardSchema.index({ roleId: 1 }, { unique: true });
// The delete guard counts pinned widgets through this path on every widget
// delete; without the index that is a collection scan.
RoleDashboardSchema.index({ "widgets.widgetId": 1 });

export default mongoose.model("RoleDashboard", RoleDashboardSchema);

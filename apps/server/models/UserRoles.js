import mongoose from "mongoose";
import { PERMISSION_KEYS } from "@demo-panel/shared/permissions";
import { SCOPES, SCOPE_VALUES } from "@demo-panel/shared/scopes";

/** { read: {type: Boolean, default: false}, write: {...}, ... } */
const permissionFields = Object.fromEntries(
  PERMISSION_KEYS.map((key) => [key, { type: Boolean, default: false }]),
);

const UserRolesSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleMaster",
      required: true,
    },
    roles: {
      type: [
        {
          menuId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MenuMaster",
            required: false,
            default: null,
          },
          menuGroupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MenuGroupMaster",
            required: false,
            default: null,
          },
          // ADR-024 (Q-4): per-menu-row scope override. null/absent means
          // "inherit UserRoles.dataScope below" — every existing role/menu
          // row across modules 1-7 keeps its current behavior with zero
          // migration. Only set this on a row that needs a *different*
          // scope than the rest of the role's screens (e.g. Leaves'
          // "approver" scope on one screen while everything else stays
          // "all").
          dataScope: {
            type: String,
            enum: SCOPE_VALUES,
            required: false,
            default: null,
          },
          ...permissionFields,
        },
      ],
      default: [],
    },
    dataScope: {
      type: String,
      enum: SCOPE_VALUES,
      default: SCOPES.ALL,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// One matrix document per role. checkPermission() looks this up on every
// guarded request, and updateUserRoles already assumes a single document —
// the index is what makes both true under concurrency. Existing databases
// with duplicates are collapsed by `npm run seed` before this builds.
UserRolesSchema.index({ roleId: 1 }, { unique: true });

export default mongoose.model("UserRoles", UserRolesSchema);

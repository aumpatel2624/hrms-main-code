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

import mongoose from "mongoose";

const MenuMasterSchema = new mongoose.Schema(
  {
    menuName: {
      type: String,
      required: true,
    },
    menuGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuGroupMaster",
      required: true,
    },
    menuUrl: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    isParent: {
      type: Boolean,
      default: false,
    },
    parentMenu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuMaster",
      default: null,
    },
    icon: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);


// ---- indexes ----------------------------------------------------------
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// The menu tree is rebuilt on every page load: menus are fetched by
// group in sequence order, then each row is probed for children by
// parentMenu. Both were collection scans.
MenuMasterSchema.index({ menuGroup: 1, sequence: 1 });
MenuMasterSchema.index({ parentMenu: 1 });
MenuMasterSchema.index({ menuName: 1 });
// A screen's URL is its real identity — the seeder upserts by menuUrl (not
// name+group, which let the same URL end up duplicated under two different
// groups; found live, OPEN-QUESTIONS.md Q-1 / GitHub #6). A real unique
// index is what actually holds under concurrency; the soft-delete plugin
// rewrites this as a partial index automatically.
MenuMasterSchema.index({ menuUrl: 1 }, { unique: true });
MenuMasterSchema.index({ isActive: 1, createdAt: -1 });
MenuMasterSchema.index({ createdAt: -1 });

export default mongoose.model("MenuMaster", MenuMasterSchema);

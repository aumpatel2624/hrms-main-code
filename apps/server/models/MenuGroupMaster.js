import mongoose from "mongoose";

const MenuGroupMasterSchema = new mongoose.Schema(
  {
    menuGroupName: {
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
    isLink: {
      type: Boolean,
      default: false,
    },
    menuUrl: {
      type: String,
      default: "#",
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
// Menu groups are always read in sequence order to build the sidebar.
MenuGroupMasterSchema.index({ sequence: 1 });
MenuGroupMasterSchema.index({ isActive: 1, sequence: 1 });

export default mongoose.model("MenuGroupMaster", MenuGroupMasterSchema);

import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
  {
    countryName: {
      type: String,
      required: true,
      unique: true,
    },
    countryCode: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true },
);


// ---- indexes ----------------------------------------------------------
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// countryName already has a unique index.
CountrySchema.index({ isActive: 1, createdAt: -1 });
CountrySchema.index({ createdAt: -1 });

export default mongoose.model("Country", CountrySchema);

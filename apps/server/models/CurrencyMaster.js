import mongoose from "mongoose";

const CurrencyMasterSchema = new mongoose.Schema(
  {
    currencyName: {
      type: String,
      required: true,
      trim: true,
    },
    currencyCode: {
      type: String,
      required: true,
      trim: true,
    },
    currencySymbol: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);


// ---- indexes ----------------------------------------------------------
// Every field the controller's `filterable` map exposes needs one, or the
// filter is a collection scan. isDeleted is deliberately NOT indexed on its
// own — see models/softDelete.js: `$ne: true` matches nearly every row and is
// too unselective to help. Compound indexes lead with the selective field.
// Every field the currency list filters on, plus its default sort.
CurrencyMasterSchema.index({ currencyName: 1 });
CurrencyMasterSchema.index({ currencyCode: 1 });
CurrencyMasterSchema.index({ isActive: 1, createdAt: -1 });
CurrencyMasterSchema.index({ createdAt: -1 });

export default mongoose.model("CurrencyMaster", CurrencyMasterSchema);

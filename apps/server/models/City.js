import mongoose from "mongoose";

const { Schema } = mongoose;

const CitySchema = new mongoose.Schema(
  {
    cityName: {
      type: String,
      required: true,
    },
    cityCode: {
      type: String,
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },
    countryId: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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
// The city dropdown is always filtered by the selected state.
CitySchema.index({ stateId: 1, cityName: 1 });
CitySchema.index({ countryId: 1 });
CitySchema.index({ isActive: 1, createdAt: -1 });
CitySchema.index({ createdAt: -1 });

export default mongoose.model("City", CitySchema);

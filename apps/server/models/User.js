import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleMaster",
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// departmentId is the department-scope filter (ADR-002) and a filterable
// field; roleId feeds the same filter map; createdAt is the default list sort.
UserSchema.index({ departmentId: 1 });
UserSchema.index({ roleId: 1 });
UserSchema.index({ createdAt: -1 });

// The remaining fields the controller's `filterable` map exposes. Without
// these each one is a collection scan: filtering 60 users by isActive examined
// all 60 to return 46, and that ratio does not improve with scale.
// isDeleted is deliberately absent — see models/softDelete.js.
UserSchema.index({ userName: 1 });
UserSchema.index({ mobileNumber: 1 });
UserSchema.index({ countryId: 1 });
UserSchema.index({ stateId: 1 });
UserSchema.index({ cityId: 1 });
// isActive is low-cardinality, so it only earns an index paired with the sort
// it is nearly always combined with.
UserSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model("User", UserSchema);

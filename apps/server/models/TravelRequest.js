import mongoose from "mongoose";

/**
 * ADR-023. No docstatus (per ADR-016) — `status` is the whole lifecycle,
 * plain and user-editable, matching source's own near-total absence of
 * validation (the one real rule is the Inactive-employee guard, enforced in
 * the controller).
 *
 * `itinerary[].advanceAmount` is a real Number here, unlike source's untyped
 * Data field — a correct-typing improvement, not a new calculation.
 *
 * `costings[].expenseType` is a plain string for now, NOT a ref — Expenses
 * (ExpenseClaimType) doesn't exist yet. See OPEN-QUESTIONS.md Q-13.
 * `sponsoredAmount`/`fundedAmount`/`totalAmount` are plain Numbers and are
 * deliberately NOT auto-summed — source has no rollup despite the field
 * names implying one; do not invent one here either.
 *
 * `itinerary` has no date-order validation (departure/arrival, check-in/
 * check-out) — source has none, per ground rules don't add any.
 */
const TravelItinerarySchema = new mongoose.Schema(
  {
    travelFrom: { type: String, trim: true },
    travelTo: { type: String, trim: true },
    modeOfTravel: {
      type: String,
      enum: ["", "Flight", "Train", "Taxi", "Rented Car"],
      default: "",
    },
    mealPreference: {
      type: String,
      enum: ["", "Vegetarian", "Non-Vegetarian", "Gluten Free", "Non Diary"],
      default: "",
    },
    travelAdvanceRequired: { type: Boolean, default: false },
    advanceAmount: { type: Number, default: null },
    departureDate: { type: Date, default: null },
    arrivalDate: { type: Date, default: null },
    lodgingRequired: { type: Boolean, default: false },
    preferredAreaForLodging: { type: String, trim: true },
    checkInDate: { type: Date, default: null },
    checkOutDate: { type: Date, default: null },
    otherDetails: { type: String, trim: true },
  },
  { _id: false },
);

const TravelRequestCostingSchema = new mongoose.Schema(
  {
    // Free text, not a ref — ExpenseClaimType doesn't exist yet (Expenses,
    // module 16). Retrofit to a real ref when it does. OPEN-QUESTIONS Q-13.
    expenseType: { type: String, trim: true },
    sponsoredAmount: { type: Number, min: 0, default: null },
    fundedAmount: { type: Number, min: 0, default: null },
    // Not computed — source has no total_amount = sponsored + funded
    // formula despite the name. Preserve the gap, don't fix it.
    totalAmount: { type: Number, min: 0, default: null },
    comments: { type: String, trim: true },
  },
  { _id: false },
);

const TravelRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    travelType: {
      type: String,
      enum: ["Domestic", "International"],
      required: true,
    },
    travelFunding: {
      type: String,
      enum: ["", "Require Full Funding", "Fully Sponsored", "Partially Sponsored, Require Partial Funding"],
      default: "",
    },
    purposeOfTravelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurposeOfTravel",
      required: true,
    },
    detailsOfSponsor: { type: String, trim: true },
    description: { type: String, trim: true },
    personalIdTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IdentificationDocumentType",
      required: false,
      default: null,
    },
    personalIdNumber: { type: String, trim: true },
    itinerary: { type: [TravelItinerarySchema], default: [] },
    costings: { type: [TravelRequestCostingSchema], default: [] },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Cancelled"],
      default: "Draft",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  { timestamps: true },
);

TravelRequestSchema.index({ employeeId: 1 });
TravelRequestSchema.index({ purposeOfTravelId: 1 });
TravelRequestSchema.index({ personalIdTypeId: 1 });
TravelRequestSchema.index({ companyId: 1 });
TravelRequestSchema.index({ status: 1, createdAt: -1 });
TravelRequestSchema.index({ travelType: 1 });
TravelRequestSchema.index({ isActive: 1, createdAt: -1 });
TravelRequestSchema.index({ createdAt: -1 });

export default mongoose.model("TravelRequest", TravelRequestSchema);

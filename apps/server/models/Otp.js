import mongoose from "mongoose";
import { OTP } from "@demo-panel/shared/auth";

const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: OTP.TTL_MS / 1000, // OTP expires after 10 minutes (600 seconds)
    },
  },
  {
    timestamps: true,
  },
);

const Otp = mongoose.model("Otp", OtpSchema);

export default Otp;

import mongoose from "mongoose";

/**
 * ADR-024 (Q-5): one document per scheduled job name, upserted after every
 * run attempt (success or failure) so `jobs/leaveScheduler.js` knows whether
 * a job has already run "today" without needing a real cron daemon.
 */
const SchedulerRunLogSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
      trim: true,
    },
    // Day-granularity — normalized to midnight UTC so "ran today" is a plain
    // date-equality check regardless of what time within the day it ran.
    lastRunDate: {
      type: Date,
      required: false,
      default: null,
    },
    lastStatus: {
      type: String,
      enum: ["success", "failed"],
      required: false,
      default: null,
    },
    lastError: {
      type: String,
      required: false,
      default: null,
    },
    lastDurationMs: {
      type: Number,
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

SchedulerRunLogSchema.index({ jobName: 1 }, { unique: true });

export default mongoose.model("SchedulerRunLog", SchedulerRunLogSchema);

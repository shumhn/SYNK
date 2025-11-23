import mongoose from "mongoose";

const TimeLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["attendance", "task"],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Auto-approve by default, can be changed to pending for strict workflows
    },
    metadata: {
      type: Map,
      of: String, // For storing IP address, device info, etc.
    },
  },
  { timestamps: true }
);

// Index for querying logs by date range
TimeLogSchema.index({ user: 1, startTime: 1 });
TimeLogSchema.index({ task: 1 });
TimeLogSchema.index({ project: 1 });

// Virtual for calculating duration on the fly if running
TimeLogSchema.virtual("currentDuration").get(function () {
  if (this.endTime) return this.duration;
  return Math.round((Date.now() - this.startTime.getTime()) / 1000 / 60);
});

export default mongoose.models.TimeLog || mongoose.model("TimeLog", TimeLogSchema);

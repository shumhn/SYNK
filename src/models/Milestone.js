import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "delayed"],
      default: "pending",
    },
    order: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

MilestoneSchema.index({ project: 1, order: 1 });

export default mongoose.models.Milestone || mongoose.model("Milestone", MilestoneSchema);

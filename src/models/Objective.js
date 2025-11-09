import mongoose from "mongoose";

const ObjectiveSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    phase: { type: mongoose.Schema.Types.ObjectId, ref: "Phase", index: true }, // optional link to a Phase
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "blocked", "cancelled"],
      default: "pending",
      index: true,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    order: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ObjectiveSchema.index({ project: 1, phase: 1, order: 1 });

export default mongoose.models.Objective || mongoose.model("Objective", ObjectiveSchema);

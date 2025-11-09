import mongoose from "mongoose";

const PhaseSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "on_hold", "cancelled"],
      default: "planned",
      index: true,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PhaseSchema.index({ project: 1, order: 1 });

export default mongoose.models.Phase || mongoose.model("Phase", PhaseSchema);

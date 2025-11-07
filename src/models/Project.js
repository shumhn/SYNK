import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["planning", "on_track", "at_risk", "delayed", "completed", "on_hold", "cancelled"],
      default: "planning",
      index: true,
    },
    archived: { type: Boolean, default: false, index: true },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true }],
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    budget: {
      allocated: { type: Number, default: 0 },
      spent: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    resources: [
      {
        type: { type: String },
        name: { type: String },
        quantity: { type: Number },
        unit: { type: String },
      },
    ],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProjectSchema.index({ title: 1 });
ProjectSchema.index({ status: 1, archived: 1 });

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);

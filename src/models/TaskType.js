import mongoose from "mongoose";

const TaskTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    description: { type: String },
    color: { type: String, default: "#3b82f6" },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

TaskTypeSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.TaskType || mongoose.model("TaskType", TaskTypeSchema);

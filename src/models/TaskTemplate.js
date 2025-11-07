import mongoose from "mongoose";

const TaskTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    taskType: {
      type: String,
      enum: ["task", "bug", "feature", "meeting", "idea", "review", "research"],
      default: "task",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent", "critical"],
      default: "medium",
    },
    estimatedHours: { type: Number },
    tags: [{ type: String }],
    checklist: [
      {
        text: { type: String, required: true },
        order: { type: Number, default: 0 },
      },
    ],
    subtasks: [
      {
        title: { type: String, required: true },
        description: { type: String },
        estimatedHours: { type: Number },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TaskTemplateSchema.index({ createdBy: 1 });
TaskTemplateSchema.index({ isPublic: 1 });

export default mongoose.models.TaskTemplate || mongoose.model("TaskTemplate", TaskTemplateSchema);
